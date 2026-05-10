<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Mic01Icon,
		MicOff01Icon,
		Video01Icon,
		VideoOffIcon,
		ComputerScreenShareIcon,
		Message01Icon,
		UserGroupIcon,
		SmileIcon,
		Settings01Icon,
		ArrowDown01Icon,
		CheckmarkCircle01Icon,
	} from '@hugeicons/core-free-icons';

	let { lkState, onLeave, activeSidebar, toggleSidebar, toggleReactions, isReactionsOpen } =
		$props<{
			lkState: LiveKitState;
			onLeave: () => void;
			activeSidebar: 'chat' | 'settings' | 'info' | 'participants' | null;
			toggleSidebar: (sidebar: 'chat' | 'settings' | 'info' | 'participants') => void;
			toggleReactions: () => void;
			isReactionsOpen: boolean;
		}>();

	let isMicOn = $derived(
		(lkState.trackChangeCount, lkState.room?.localParticipant.isMicrophoneEnabled ?? false)
	);
	let isVideoOn = $derived(
		(lkState.trackChangeCount, lkState.room?.localParticipant.isCameraEnabled ?? false)
	);

	let meetingDuration = $state('00:00');
	let interval: ReturnType<typeof setInterval>;

	/** Device lists populated after browser permission is granted */
	let audioDevices = $state<MediaDeviceInfo[]>([]);
	let videoDevices = $state<MediaDeviceInfo[]>([]);
	let activeMicId = $state('');
	let activeCamId = $state('');

	/** Which device picker is open: 'mic' | 'cam' | null */
	let openPicker = $state<'mic' | 'cam' | null>(null);

	/** Enumerate available media devices */
	async function loadDevices() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			audioDevices = devices.filter((d) => d.kind === 'audioinput');
			videoDevices = devices.filter((d) => d.kind === 'videoinput');
		} catch {
			// Permission not granted yet — will be populated on first toggle
		}
	}

	function handlePickerClose(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest('[data-picker]')) {
			openPicker = null;
		}
	}

	onMount(() => {
		const startTime = Date.now();
		interval = setInterval(() => {
			const diff = Math.floor((Date.now() - startTime) / 1000);
			const mins = Math.floor(diff / 60)
				.toString()
				.padStart(2, '0');
			const secs = (diff % 60).toString().padStart(2, '0');
			meetingDuration = `${mins}:${secs}`;
		}, 1000);

		loadDevices();
		navigator.mediaDevices.addEventListener('devicechange', loadDevices);
		document.addEventListener('click', handlePickerClose, true);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
		document.removeEventListener('click', handlePickerClose, true);
	});

	function togglePicker(picker: 'mic' | 'cam') {
		if (audioDevices.length === 0 && videoDevices.length === 0) {
			loadDevices();
		}
		openPicker = openPicker === picker ? null : picker;
	}

	async function selectMic(deviceId: string) {
		activeMicId = deviceId;
		openPicker = null;
		await lkState.switchMicrophone(deviceId);
	}

	async function selectCam(deviceId: string) {
		activeCamId = deviceId;
		openPicker = null;
		await lkState.switchCamera(deviceId);
	}

	const REACTIONS = ['👍', '👎', '👏', '👋', '❤️', '🎉'];
</script>

<div class="pointer-events-auto z-10 flex h-20 shrink-0 items-center px-6">
	<!-- Left: timer -->
	<div class="flex flex-1 items-center gap-3">
		<span class="text-meet-text-muted text-sm font-medium tabular-nums">{meetingDuration}</span>
	</div>

	<!-- Center: controls -->
	<div class="relative flex items-center justify-center gap-2">
		<!-- ── Microphone pill ── -->
		<div class="relative" data-picker>
			{#if openPicker === 'mic'}
				<div
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-56 overflow-hidden rounded-xl border shadow-xl"
				>
					<p
						class="text-meet-text-muted px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase"
					>
						Select a microphone
					</p>
					{#each audioDevices as d (d.deviceId)}
						<button
							class="hover:bg-meet-btn flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							onclick={() => selectMic(d.deviceId)}
						>
							{#if activeMicId === d.deviceId || (!activeMicId && d.deviceId === 'default')}
								<Icon icon={CheckmarkCircle01Icon} size={14} color="var(--brand)" />
							{:else}
								<span class="size-[14px]"></span>
							{/if}
							<span class="truncate">{d.label || 'Microphone'}</span>
						</button>
					{/each}
					{#if audioDevices.length === 0}
						<p class="text-meet-text-muted px-3 py-2 text-sm">No devices found</p>
					{/if}
				</div>
			{/if}

			<div
				class="flex items-center overflow-hidden rounded-full transition-colors {isMicOn
					? 'bg-meet-btn'
					: 'bg-meet-red hover:bg-meet-red-hover'}"
			>
				<Button
					onclick={() => lkState.toggleMicrophone()}
					class="text-meet-text hover:bg-meet-btn-hover h-12 rounded-none rounded-l-full border-none bg-transparent pr-3 pl-4 shadow-none"
					aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
				>
					<Icon icon={Mic01Icon} altIcon={MicOff01Icon} showAlt={!isMicOn} />
				</Button>
				<Button
					onclick={() => togglePicker('mic')}
					class="border-meet-text/15 text-meet-text hover:bg-meet-btn-hover h-12 rounded-none rounded-r-full border-y-0 border-r-0 border-l bg-transparent pr-3 pl-1 shadow-none"
					aria-label="Select microphone"
					aria-expanded={openPicker === 'mic'}
				>
					<Icon
						icon={ArrowDown01Icon}
						size={14}
						class="transition-transform {openPicker === 'mic' ? 'rotate-180' : ''}"
					/>
				</Button>
			</div>
		</div>

		<!-- ── Camera pill ── -->
		<div class="relative" data-picker>
			{#if openPicker === 'cam'}
				<div
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-56 overflow-hidden rounded-xl border shadow-xl"
				>
					<p
						class="text-meet-text-muted px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase"
					>
						Select a camera
					</p>
					{#each videoDevices as d (d.deviceId)}
						<button
							class="hover:bg-meet-btn flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							onclick={() => selectCam(d.deviceId)}
						>
							{#if activeCamId === d.deviceId || (!activeCamId && d.deviceId === 'default')}
								<Icon icon={CheckmarkCircle01Icon} size={14} color="var(--brand)" />
							{:else}
								<span class="size-[14px]"></span>
							{/if}
							<span class="truncate">{d.label || 'Camera'}</span>
						</button>
					{/each}
					{#if videoDevices.length === 0}
						<p class="text-meet-text-muted px-3 py-2 text-sm">No devices found</p>
					{/if}
				</div>
			{/if}

			<div
				class="flex items-center overflow-hidden rounded-full transition-colors {isVideoOn
					? 'bg-meet-btn'
					: 'bg-meet-red hover:bg-meet-red-hover'}"
			>
				<Button
					onclick={() => lkState.toggleCamera()}
					class="text-meet-text hover:bg-meet-btn-hover h-12 rounded-none rounded-l-full border-none bg-transparent pr-3 pl-4 shadow-none"
					aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
				>
					<Icon icon={Video01Icon} altIcon={VideoOffIcon} showAlt={!isVideoOn} />
				</Button>
				<Button
					onclick={() => togglePicker('cam')}
					class="border-meet-text/15 text-meet-text hover:bg-meet-btn-hover h-12 rounded-none rounded-r-full border-y-0 border-r-0 border-l bg-transparent pr-3 pl-1 shadow-none"
					aria-label="Select camera"
					aria-expanded={openPicker === 'cam'}
				>
					<Icon
						icon={ArrowDown01Icon}
						size={14}
						class="transition-transform {openPicker === 'cam' ? 'rotate-180' : ''}"
					/>
				</Button>
			</div>
		</div>

		<!-- ── Screen Share ── -->
		<Button
			onclick={() => lkState.toggleScreenShare()}
			class="h-12 w-12 rounded-full border-none shadow-none transition-colors {lkState.isScreenSharing
				? 'bg-meet-btn-active text-meet-text'
				: 'bg-meet-btn hover:bg-meet-btn-hover text-meet-text'}"
			aria-label="Share screen"
		>
			<Icon icon={ComputerScreenShareIcon} />
		</Button>

		<!-- ── Participants ── -->
		<Button
			onclick={() => toggleSidebar('participants')}
			class="relative h-12 w-12 rounded-full border-none shadow-none transition-colors {activeSidebar ===
			'participants'
				? 'bg-meet-btn-active text-meet-text'
				: 'bg-meet-btn hover:bg-meet-btn-hover text-meet-text'}"
			aria-label="Participants"
		>
			<Icon icon={UserGroupIcon} />
			<span
				class="bg-meet-card text-meet-text border-meet-panel absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] font-bold"
			>
				{lkState.participants.length}
			</span>
		</Button>

		<!-- ── Chat ── -->
		<Button
			onclick={() => toggleSidebar('chat')}
			class="h-12 w-12 rounded-full border-none shadow-none transition-colors {activeSidebar ===
			'chat'
				? 'bg-meet-btn-active text-meet-text'
				: 'bg-meet-btn hover:bg-meet-btn-hover text-meet-text'}"
			aria-label="Chat"
		>
			<Icon icon={Message01Icon} />
		</Button>

		<!-- ── Reactions ── -->
		<div class="relative" data-reactions>
			<Button
				onclick={toggleReactions}
				class="h-12 w-12 rounded-full border-none shadow-none transition-colors {isReactionsOpen
					? 'bg-meet-btn-active text-meet-text'
					: 'bg-meet-btn hover:bg-meet-btn-hover text-meet-text'}"
				aria-label="Reactions"
				aria-expanded={isReactionsOpen}
			>
				<Icon icon={SmileIcon} />
			</Button>

			{#if isReactionsOpen}
				<div
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-1/2 flex -translate-x-1/2 gap-1 rounded-full border px-3 py-2 shadow-xl"
				>
					{#each REACTIONS as emoji (emoji)}
						<button
							class="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform hover:scale-125"
							onclick={() => {
								toggleReactions();
								lkState.sendMessage(emoji);
							}}
						>
							{emoji}
						</button>
					{/each}
					<!-- Caret -->
					<div
						class="border-t-meet-border absolute -bottom-2 left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-b-0 border-solid border-x-transparent"
					></div>
					<div
						class="border-t-meet-panel absolute bottom-[-7px] left-1/2 -translate-x-1/2 border-x-[7px] border-t-[7px] border-b-0 border-solid border-x-transparent"
					></div>
				</div>
			{/if}
		</div>

		<!-- ── Settings ── -->
		<Button
			onclick={() => toggleSidebar('settings')}
			class="h-12 w-12 rounded-full border-none shadow-none transition-colors {activeSidebar ===
			'settings'
				? 'bg-meet-btn-active text-meet-text'
				: 'bg-meet-btn hover:bg-meet-btn-hover text-meet-text'}"
			aria-label="Settings"
		>
			<Icon icon={Settings01Icon} />
		</Button>

		<!-- ── Leave ── -->
		<Button
			onclick={onLeave}
			class="bg-meet-red hover:bg-meet-red-hover ml-2 h-12 rounded-full border-none px-6 text-[15px] font-medium text-white shadow-none"
		>
			Leave
		</Button>
	</div>

	<!-- Right spacer -->
	<div class="flex-1"></div>
</div>
