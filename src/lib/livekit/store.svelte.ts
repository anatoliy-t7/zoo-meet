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
						return;
					}

					const lock = inboundLockSchema.safeParse(raw);
					if (lock.success) {
						this.isLocked = lock.data.locked;
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
		this.isScreenSharing = !enabled;
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
