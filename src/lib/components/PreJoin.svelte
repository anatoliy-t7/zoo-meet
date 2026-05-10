<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		createLocalVideoTrack,
		createLocalAudioTrack,
		type LocalVideoTrack,
		type LocalAudioTrack,
		Room,
	} from 'livekit-client';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import {
		Mic01Icon,
		MicOff01Icon,
		Video01Icon,
		VideoOffIcon,
		LockPasswordIcon,
	} from '@hugeicons/core-free-icons';
	import { PersistedState } from 'runed';

	let { onJoin } = $props<{
		onJoin: (name: string, videoTrack?: LocalVideoTrack, audioTrack?: LocalAudioTrack) => void;
	}>();

	const persistedRememberName = new PersistedState('prejoin-remember-name', true);
	const persistedName = new PersistedState('prejoin-name', '');

	let name = $state(persistedRememberName.current ? persistedName.current : '');

	$effect(() => {
		if (persistedRememberName.current) {
			persistedName.current = name;
		}
	});

	let videoTrack = $state<LocalVideoTrack | null>(null);
	let audioTrack = $state<LocalAudioTrack | null>(null);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let isVideoEnabled = $state(false);
	let isAudioEnabled = $state(false);

	let videoDevices = $state<MediaDeviceInfo[]>([]);
	let audioDevices = $state<MediaDeviceInfo[]>([]);
	let selectedVideoDevice = $state('');
	let selectedAudioDevice = $state('');

	$effect(() => {
		if (videoElement && videoTrack && isVideoEnabled) {
			videoTrack.attach(videoElement);
		}
		return () => {
			if (videoElement && videoTrack) videoTrack.detach(videoElement!);
		};
	});

	onMount(async () => {
		// Always request both devices on load — triggers the browser permission prompt
		// on first visit and silently auto-enables on return visits.
		const [videoResult, audioResult] = await Promise.allSettled([
			createLocalVideoTrack(),
			createLocalAudioTrack(),
		]);

		if (videoResult.status === 'fulfilled') {
			videoTrack = videoResult.value;
			isVideoEnabled = true;
		}
		if (audioResult.status === 'fulfilled') {
			audioTrack = audioResult.value;
			isAudioEnabled = true;
		}

		// Enumerate devices — labels are available now that permission has been granted
		try {
			videoDevices = await Room.getLocalDevices('videoinput');
			if (videoDevices.length > 0) selectedVideoDevice = videoDevices[0].deviceId;
		} catch (e) {
			console.error('Could not get video devices', e);
		}
		try {
			audioDevices = await Room.getLocalDevices('audioinput');
			if (audioDevices.length > 0) selectedAudioDevice = audioDevices[0].deviceId;
		} catch (e) {
			console.error('Could not get audio devices', e);
		}
	});

	onDestroy(() => {
		if (videoTrack) videoTrack.stop();
		if (audioTrack) audioTrack.stop();
	});

	async function toggleVideo() {
		if (!videoTrack) {
			try {
				videoTrack = await createLocalVideoTrack({
					deviceId: selectedVideoDevice,
				});
				isVideoEnabled = true;
			} catch (e) {
				console.error(e);
			}
			return;
		}
		if (isVideoEnabled) await videoTrack.mute();
		else await videoTrack.unmute();
		isVideoEnabled = !isVideoEnabled;
	}

	async function toggleAudio() {
		if (!audioTrack) {
			try {
				audioTrack = await createLocalAudioTrack({
					deviceId: selectedAudioDevice,
				});
				isAudioEnabled = true;
			} catch (e) {
				console.error(e);
			}
			return;
		}
		if (isAudioEnabled) await audioTrack.mute();
		else await audioTrack.unmute();
		isAudioEnabled = !isAudioEnabled;
	}

	function handleJoin() {
		if (!name.trim()) return;
		// Transfer ownership — null out refs so onDestroy doesn't stop the tracks
		// before the room page has a chance to publish them.
		const video = videoTrack ?? undefined;
		const audio = audioTrack ?? undefined;
		videoTrack = null;
		audioTrack = null;
		onJoin(name, video, audio);
	}
</script>

<div
	class="bg-background text-foreground flex min-h-screen items-center justify-center p-6 font-sans"
>
	<div class="flex w-full max-w-5xl flex-col items-center justify-center gap-12 md:flex-row">
		<!-- Left: Video Preview -->
		<div class="flex w-full flex-col gap-4 md:w-[600px]">
			<div
				class="bg-card relative flex aspect-16/10 w-full items-center justify-center overflow-hidden rounded-3xl shadow-lg"
			>
				{#if isVideoEnabled && videoTrack}
					<video
						bind:this={videoElement}
						class="absolute inset-0 h-full w-full -scale-x-100 object-cover"
						autoplay
						muted
						playsinline
					></video>
				{:else}
					<div
						class="bg-primary text-primary-foreground flex size-20 items-center justify-center rounded-full text-2xl font-bold uppercase"
					>
						{name ? name.charAt(0) : '?'}
					</div>
				{/if}

				<div class="absolute bottom-4 left-5 text-sm font-medium">
					{name || 'Guest'}
				</div>

				<div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
					<Button
						variant="outline"
						size="icon"
						onclick={toggleAudio}
						class="border-border bg-secondary/90 size-14 rounded-full"
						aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
					>
						<Icon icon={Mic01Icon} altIcon={MicOff01Icon} showAlt={!isAudioEnabled} />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onclick={toggleVideo}
						class="border-border bg-secondary/90 size-14 rounded-full"
						aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
					>
						<Icon icon={Video01Icon} altIcon={VideoOffIcon} showAlt={!isVideoEnabled} />
					</Button>
				</div>
			</div>

			<!-- Device selectors -->
			<div class="flex gap-4">
				<div class="flex flex-1 flex-col gap-1">
					<Label class="text-muted-foreground pl-2.5">Microphone</Label>
					<Select.Root
						type="single"
						bind:value={selectedAudioDevice}
						onValueChange={(v) => (selectedAudioDevice = v)}
					>
						<Select.Trigger>
							<span class="max-w-56 truncate">
								{audioDevices.find((d) => d.deviceId === selectedAudioDevice)?.label ||
									'Default microphone'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#if audioDevices.length === 0}
								<Select.Item value="" label="Default microphone" />
							{:else}
								{#each audioDevices as d (d.deviceId)}
									<Select.Item value={d.deviceId} label={d.label || 'Microphone'} />
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-1 flex-col gap-1">
					<Label class="text-muted-foreground pl-2.5">Camera</Label>
					<Select.Root
						type="single"
						bind:value={selectedVideoDevice}
						onValueChange={(v) => (selectedVideoDevice = v)}
					>
						<Select.Trigger>
							<span class="max-w-56 truncate">
								{videoDevices.find((d) => d.deviceId === selectedVideoDevice)?.label ||
									'Default camera'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#if videoDevices.length === 0}
								<Select.Item value="" label="Default camera" />
							{:else}
								{#each videoDevices as d (d.deviceId)}
									<Select.Item value={d.deviceId} label={d.label || 'Camera'} />
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>

		<!-- Right: Join form -->
		<div class="flex w-full flex-col pt-8 md:w-[400px] md:pt-0">
			<h2 class="mb-3 text-center text-3xl font-semibold">Join room</h2>
			<p class="text-muted-foreground mb-5 text-center text-[15px] leading-relaxed md:text-left">
				End-to-end encrypted — only participants in this meeting can see or hear anything.
			</p>
			<div class="text-brand mb-6 flex items-center gap-2 text-sm font-medium">
				<Icon icon={LockPasswordIcon} size={16} />
				End-to-end encrypted
			</div>

			<div class="space-y-5">
				<div class="flex flex-col gap-1.5">
					<Label for="name-input" class="text-muted-foreground pl-2.5">Your name</Label>
					<Input
						id="name-input"
						type="text"
						bind:value={name}
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleJoin()}
						placeholder="Enter your name"
					/>
				</div>

				<div class="flex items-center gap-2">
					<Checkbox
						id="remember-name"
						checked={persistedRememberName.current}
						onCheckedChange={(v) => {
							persistedRememberName.current = v === true;
							if (!v) persistedName.current = '';
						}}
					/>
					<Label for="remember-name" class="text-muted-foreground">
						Remember my name on this device
					</Label>
				</div>

				<Button
					onclick={handleJoin}
					disabled={!name.trim()}
					class="w-full rounded-full py-6 text-[15px] font-semibold"
				>
					Start meeting
				</Button>
			</div>
		</div>
	</div>
</div>
