import {
	Room,
	RoomEvent,
	ExternalE2EEKeyProvider,
	Track,
	type Participant,
	type RoomOptions,
	type LocalAudioTrack,
	type RemoteTrackPublication,
} from 'livekit-client';
import { BackgroundBlur, supportsBackgroundProcessors } from '@livekit/track-processors';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { z } from 'zod';

export type ChatMessage = {
	id: string;
	sender: string;
	text: string;
	timestamp: number;
	isLocal: boolean;
};

const inboundChatSchema = z.object({
	type: z.literal('chat'),
	text: z.string().min(1).max(2000),
});

const inboundLockSchema = z.object({
	type: z.literal('lock'),
	locked: z.boolean(),
});

const inboundReactionSchema = z.object({
	type: z.literal('reaction'),
	emoji: z.string().min(1).max(10),
	/** Fallback when DataReceived omits participant (rare); must match sender when participant is present. */
	from: z.string().min(1).max(256).optional(),
});

const inboundRaiseHandSchema = z.object({
	type: z.literal('raise-hand'),
	raised: z.boolean(),
});

/** Cryptographically random hex ID for messages. */
function randomId(): string {
	return crypto
		.getRandomValues(new Uint8Array(6))
		.reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
}

export class LiveKitState {
	room: Room | null = $state(null);
	participants: Participant[] = $state([]);
	activeSpeakers: Participant[] = $state([]);
	messages: ChatMessage[] = $state([]);
	isScreenSharing: boolean = $state(false);
	trackChangeCount: number = $state(0);
	/** True once E2EE key has been set and the room was opened with encryption enabled. */
	e2eeEnabled: boolean = $state(false);
	/** Whether the background blur processor is active. */
	isBlurEnabled: boolean = $state(false);
	/** Whether the meeting is locked (no new participants). */
	isLocked: boolean = $state(false);
	/** Active emoji reactions keyed by participant identity. Cleared after 5 s. */
	activeReactions: SvelteMap<string, string> = new SvelteMap();
	/** Participant identities that have raised their hand. */
	raisedHands: SvelteSet<string> = new SvelteSet();
	/** Count of inbound chat messages received while the chat sidebar was closed (cleared on open). */
	unreadChatCount: number = $state(0);
	/** Mirrors whether the Chat sidebar is visible; drives unread tally. */
	chatSidebarOpen: boolean = $state(false);

	/** Per-identity timers for clearing reactions. Not reactive — internal only. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- intentionally non-reactive timer map
	private reactionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

	private updateParticipants() {
		if (!this.room) return;
		const all: Participant[] = [];
		if (this.room.localParticipant) all.push(this.room.localParticipant);
		this.room.remoteParticipants.forEach((p) => all.push(p));
		this.participants = all;
	}

	triggerTrackChange() {
		this.trackChangeCount++;
		this.updateParticipants();
		// Sync with actual track state so external "Stop sharing" is caught too
		this.isScreenSharing = this.room?.localParticipant.isScreenShareEnabled ?? false;
	}

	/**
	 * Connect to a LiveKit room.
	 * @param e2eeKey  Optional passphrase for E2EE (derived via PBKDF2 inside the SDK).
	 *                 Pass the value extracted from the URL fragment — it is never sent to
	 *                 any server.
	 */
	async connect(url: string, token: string, e2eeKey?: string) {
		if (this.room) await this.disconnect();

		// Build room options, including E2EE when a key is provided
		const roomOptions: RoomOptions = {
			adaptiveStream: true,
			dynacast: true,
			videoCaptureDefaults: {
				resolution: { width: 1280, height: 720, frameRate: 30 },
			},
		};

		if (e2eeKey) {
			const keyProvider = new ExternalE2EEKeyProvider();
			await keyProvider.setKey(e2eeKey);
			roomOptions.encryption = {
				keyProvider,
				// Vite resolves this to the bundled worker script at build time.
				// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not a reactive value
				worker: new Worker(new URL('livekit-client/e2ee-worker', import.meta.url), {
					type: 'module',
				}),
			};
		}

		const newRoom = new Room(roomOptions);

		newRoom
			.on(RoomEvent.ParticipantConnected, () => this.updateParticipants())
			.on(RoomEvent.ParticipantDisconnected, () => this.updateParticipants())
			.on(RoomEvent.TrackSubscribed, () => this.triggerTrackChange())
			.on(RoomEvent.TrackUnsubscribed, () => this.triggerTrackChange())
			.on(RoomEvent.LocalTrackPublished, () => this.triggerTrackChange())
			.on(RoomEvent.LocalTrackUnpublished, () => this.triggerTrackChange())
			.on(RoomEvent.TrackMuted, () => this.triggerTrackChange())
			.on(RoomEvent.TrackUnmuted, () => this.triggerTrackChange())
			.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
				this.activeSpeakers = speakers;
			})
			.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: Participant) => {
				try {
					const raw = JSON.parse(new TextDecoder().decode(payload));

					const chat = inboundChatSchema.safeParse(raw);
					if (chat.success) {
						this.messages.push({
							id: randomId(),
							sender: participant?.name || participant?.identity || 'Unknown',
							text: chat.data.text,
							timestamp: Date.now(),
							isLocal: false,
						});
						if (!this.chatSidebarOpen) {
							this.unreadChatCount++;
						}
						return;
					}

					const lock = inboundLockSchema.safeParse(raw);
					if (lock.success) {
						this.isLocked = lock.data.locked;
						return;
					}

					const reaction = inboundReactionSchema.safeParse(raw);
					if (reaction.success) {
						const identity = participant?.identity ?? reaction.data.from;
						if (!identity) return;
						this.applyReaction(identity, reaction.data.emoji);
						return;
					}

					const hand = inboundRaiseHandSchema.safeParse(raw);
					if (hand.success && participant?.identity) {
						if (hand.data.raised) {
							this.raisedHands.add(participant.identity);
						} else {
							this.raisedHands.delete(participant.identity);
						}
					}
				} catch {
					// Malformed packet — silently drop
				}
			});

		try {
			await newRoom.connect(url, token);
		} catch (err) {
			newRoom.removeAllListeners();
			await newRoom.disconnect();
			throw err;
		}

		this.room = newRoom;
		this.e2eeEnabled = !!e2eeKey;
		this.updateParticipants();
	}

	async disconnect() {
		if (!this.room) return;
		this.room.removeAllListeners();
		await this.room.disconnect();
		this.room = null;
		this.participants = [];
		this.activeSpeakers = [];
		this.messages = [];
		this.isScreenSharing = false;
		this.e2eeEnabled = false;
		this.isBlurEnabled = false;
		this.isLocked = false;
		this.activeReactions.clear();
		this.raisedHands.clear();
		this.unreadChatCount = 0;
		this.chatSidebarOpen = false;
		this.reactionTimers.forEach((t) => clearTimeout(t));
		this.reactionTimers.clear();
	}

	/** Call when Chat panel opens or closes; clears unread only when opened. */
	setChatSidebarOpen(open: boolean) {
		this.chatSidebarOpen = open;
		if (open) {
			this.unreadChatCount = 0;
		}
	}

	/** Schedule an emoji reaction to disappear from a tile after 5 s. */
	private applyReaction(identity: string, emoji: string) {
		const existing = this.reactionTimers.get(identity);
		if (existing) clearTimeout(existing);
		this.activeReactions.set(identity, emoji);
		const timer = setTimeout(() => {
			this.activeReactions.delete(identity);
			this.reactionTimers.delete(identity);
		}, 5000);
		this.reactionTimers.set(identity, timer);
	}

	/** Send a floating emoji reaction visible to all participants for 5 seconds. */
	async sendReaction(emoji: string) {
		if (!this.room) return;
		const identity = this.room.localParticipant.identity;
		this.applyReaction(identity, emoji);
		const payload = new TextEncoder().encode(
			JSON.stringify({ type: 'reaction', emoji, from: identity })
		);
		await this.room.localParticipant.publishData(payload, { reliable: true });
	}

	/** Toggle raise-hand state and broadcast to all participants. */
	toggleRaiseHand() {
		if (!this.room) return;
		const identity = this.room.localParticipant.identity;
		const raised = !this.raisedHands.has(identity);
		if (raised) {
			this.raisedHands.add(identity);
		} else {
			this.raisedHands.delete(identity);
		}
		const payload = new TextEncoder().encode(JSON.stringify({ type: 'raise-hand', raised }));
		this.room.localParticipant.publishData(payload, { reliable: true });
	}

	async toggleMicrophone() {
		if (!this.room) return;
		await this.room.localParticipant.setMicrophoneEnabled(
			!this.room.localParticipant.isMicrophoneEnabled
		);
		this.triggerTrackChange();
	}

	async toggleCamera() {
		if (!this.room) return;
		await this.room.localParticipant.setCameraEnabled(!this.room.localParticipant.isCameraEnabled);
		this.triggerTrackChange();
	}

	async switchMicrophone(deviceId: string) {
		if (!this.room) return;
		await this.room.switchActiveDevice('audioinput', deviceId);
		this.triggerTrackChange();
	}

	async switchCamera(deviceId: string) {
		if (!this.room) return;
		await this.room.switchActiveDevice('videoinput', deviceId);
		this.triggerTrackChange();
	}

	async toggleScreenShare() {
		if (!this.room) return;
		const enabled = this.room.localParticipant.isScreenShareEnabled;
		await this.room.localParticipant.setScreenShareEnabled(!enabled);
		this.triggerTrackChange();
	}

	/** Apply or remove the background blur processor on the local camera track. */
	async toggleBackgroundBlur(enabled: boolean) {
		if (!this.room || !supportsBackgroundProcessors()) return;
		const pub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
		const videoTrack = pub?.videoTrack;
		if (!videoTrack) return;

		if (enabled) {
			await videoTrack.setProcessor(BackgroundBlur(10));
		} else {
			await videoTrack.stopProcessor();
		}
		this.isBlurEnabled = enabled;
	}

	/** Pause or resume remote participants' video subscriptions to save bandwidth. */
	setIncomingVideoEnabled(enabled: boolean) {
		if (!this.room) return;
		this.room.remoteParticipants.forEach((p) => {
			const pub = p.getTrackPublication(Track.Source.Camera) as RemoteTrackPublication | undefined;
			pub?.setSubscribed(enabled);
			const screenPub = p.getTrackPublication(Track.Source.ScreenShare) as RemoteTrackPublication | undefined;
			screenPub?.setSubscribed(enabled);
		});
	}

	/** Toggle browser-native noise suppression on the local microphone track. */
	async setNoiseCancellationEnabled(enabled: boolean) {
		if (!this.room) return;
		const pub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
		const audioTrack = pub?.audioTrack as LocalAudioTrack | undefined;
		if (!audioTrack) return;
		await audioTrack.mediaStreamTrack.applyConstraints({ noiseSuppression: enabled });
	}

	/**
	 * Broadcast meeting lock state to all participants via the data channel.
	 * Note: preventing new joins requires server-side enforcement in the token API.
	 */
	setLocked(locked: boolean) {
		if (!this.room) return;
		this.isLocked = locked;
		const payload = new TextEncoder().encode(JSON.stringify({ type: 'lock', locked }));
		this.room.localParticipant.publishData(payload, { reliable: true });
	}

	sendMessage(text: string) {
		if (!this.room) return;
		const trimmed = text.trim().slice(0, 2000);
		if (!trimmed) return;
		const payload = new TextEncoder().encode(JSON.stringify({ type: 'chat', text: trimmed }));
		this.room.localParticipant.publishData(payload, { reliable: true });
		this.messages.push({
			id: randomId(),
			sender: this.room.localParticipant.name || 'Me',
			text: trimmed,
			timestamp: Date.now(),
			isLocal: true,
		});
	}
}

export function createLiveKitState() {
	return new LiveKitState();
}
