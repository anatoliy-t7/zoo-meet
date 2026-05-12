<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
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

	let t = $derived(page.data.t);

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

	const REACTIONS = ['👍', '👎', '👏', '❤️', '🎉'];

	let isHandRaised = $derived(
		lkState.raisedHands.has(lkState.room?.localParticipant.identity ?? '')
	);

	let unreadChatBadge = $derived(
		lkState.unreadChatCount > 99 ? '99+' : String(lkState.unreadChatCount)
	);

	let chatAriaLabel = $derived(
		lkState.unreadChatCount > 0
			? t('control.chat_unread', { count: lkState.unreadChatCount })
			: t('control.chat')
	);
</script>

<div
	class="pointer-events-auto z-10 flex shrink-0 flex-col gap-2 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:h-20 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:pt-0 sm:pb-[max(0px,env(safe-area-inset-bottom))]"
>
	<!-- Mobile: timer row -->
	<div class="flex shrink-0 items-center sm:hidden">
		<span class="text-meet-text-muted text-xs font-medium tabular-nums">{meetingDuration}</span>
	</div>

	<!-- Desktop: timer -->
	<div class="hidden flex-1 items-center gap-3 sm:flex">
		<span class="text-meet-text-muted text-sm font-medium tabular-nums">{meetingDuration}</span>
	</div>

	<!-- Controls: wrap on narrow viewports so popovers are not clipped -->
	<div
		class="relative -mx-1 flex max-w-full min-w-0 flex-wrap content-center items-center justify-center gap-x-1.5 gap-y-2 px-1 sm:mx-0 sm:flex-nowrap sm:gap-2"
	>
		<!-- ── Microphone pill ── -->
		<div class="relative" data-picker>
			{#if openPicker === 'mic'}
				<div
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-0 z-20 max-w-[min(20rem,calc(100vw-1.5rem))] min-w-56 overflow-hidden rounded-xl border shadow-xl max-sm:left-1/2 max-sm:max-w-[min(22rem,calc(100vw-1rem))] max-sm:-translate-x-1/2"
				>
					<p
						class="text-meet-text-muted px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase"
					>
						{t('control.select_microphone')}
					</p>
					{#each audioDevices as d (d.deviceId)}
						<button
							class="hover:bg-meet-btn flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							onclick={() => selectMic(d.deviceId)}
						>
							{#if activeMicId === d.deviceId || (!activeMicId && d.deviceId === 'default')}
								<Icon icon={CheckmarkCircle01Icon} size={14} color="var(--brand)" />
							{:else}
								<span class="size-3.5"></span>
							{/if}
							<span class="truncate">{d.label || t('control.microphone')}</span>
						</button>
					{/each}
					{#if audioDevices.length === 0}
						<p class="text-meet-text-muted px-3 py-2 text-sm">{t('control.no_devices')}</p>
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
					class="text-meet-text hover:bg-meet-btn-hover h-10 rounded-none rounded-l-full border-none bg-transparent pr-2 pl-3 shadow-none sm:h-12 sm:pr-3 sm:pl-4"
					aria-label={isMicOn ? t('control.mute_mic') : t('control.unmute_mic')}
				>
					<Icon icon={Mic01Icon} altIcon={MicOff01Icon} showAlt={!isMicOn} />
				</Button>
				<Button
					onclick={() => togglePicker('mic')}
					class="border-meet-text/15 text-meet-text hover:bg-meet-btn-hover h-10 rounded-none rounded-r-full border-y-0 border-r-0 border-l bg-transparent pr-2 pl-1 shadow-none sm:h-12 sm:pr-3"
					aria-label={t('control.select_mic')}
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
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-0 z-20 max-w-[min(20rem,calc(100vw-1.5rem))] min-w-56 overflow-hidden rounded-xl border shadow-xl max-sm:left-1/2 max-sm:max-w-[min(22rem,calc(100vw-1rem))] max-sm:-translate-x-1/2"
				>
					<p
						class="text-meet-text-muted px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase"
					>
						{t('control.select_camera')}
					</p>
					{#each videoDevices as d (d.deviceId)}
						<button
							class="hover:bg-meet-btn flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							onclick={() => selectCam(d.deviceId)}
						>
							{#if activeCamId === d.deviceId || (!activeCamId && d.deviceId === 'default')}
								<Icon icon={CheckmarkCircle01Icon} size={14} color="var(--brand)" />
							{:else}
								<span class="size-3.5"></span>
							{/if}
							<span class="truncate">{d.label || t('control.camera')}</span>
						</button>
					{/each}
					{#if videoDevices.length === 0}
						<p class="text-meet-text-muted px-3 py-2 text-sm">{t('control.no_devices')}</p>
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
					class="text-meet-text hover:bg-meet-btn-hover h-10 rounded-none rounded-l-full border-none bg-transparent pr-2 pl-3 shadow-none sm:h-12 sm:pr-3 sm:pl-4"
					aria-label={isVideoOn ? t('control.turn_off_camera') : t('control.turn_on_camera')}
				>
					<Icon icon={Video01Icon} altIcon={VideoOffIcon} showAlt={!isVideoOn} />
				</Button>
				<Button
					onclick={() => togglePicker('cam')}
					class="border-meet-text/15 text-meet-text hover:bg-meet-btn-hover h-10 rounded-none rounded-r-full border-y-0 border-r-0 border-l bg-transparent pr-2 pl-1 shadow-none sm:h-12 sm:pr-3"
					aria-label={t('control.select_cam')}
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
			class="size-10 sm:size-12 {lkState.isScreenSharing
				? 'bg-meet-btn-active text-meet-text'
				: ''}"
			size="icon-lg"
			variant="secondary"
			aria-label={t('control.share_screen')}
		>
			<Icon icon={ComputerScreenShareIcon} />
		</Button>

		<!-- ── Participants ── -->
		<Button
			onclick={() => toggleSidebar('participants')}
			class="relative size-10 sm:size-12 {activeSidebar === 'participants'
				? 'bg-meet-btn-active text-meet-text'
				: ''}"
			size="icon-lg"
			variant="secondary"
			aria-label={t('control.participants')}
		>
			<Icon icon={UserGroupIcon} />
			<span
				class="bg-meet-card text-meet-text border-meet-panel absolute top-0 right-0 flex size-4 items-center justify-center rounded-full border-2 text-[9px] font-bold"
			>
				{lkState.participants.length}
			</span>
		</Button>

		<!-- ── Chat ── -->
		<Button
			onclick={() => toggleSidebar('chat')}
			size="icon-lg"
			variant="secondary"
			class="relative {activeSidebar === 'chat' ? 'bg-meet-btn-active text-meet-text' : ''}"
			aria-label={chatAriaLabel}
		>
			<Icon icon={Message01Icon} />
			{#if lkState.unreadChatCount > 0}
				<span
					class="border-meet-panel bg-primary text-primary-foreground absolute top-0 right-0 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 px-0.5 text-[9px] font-bold"
				>
					{unreadChatBadge}
				</span>
			{/if}
		</Button>

		<!-- ── Reactions ── -->
		<div class="relative" data-reactions>
			<!-- Button shows ✋ when hand is raised, smile otherwise -->
			<Button
				onclick={toggleReactions}
				class={isReactionsOpen || isHandRaised ? 'bg-meet-btn-active text-meet-text' : ''}
				size="icon-lg"
				variant="secondary"
				aria-label={t('control.reactions')}
				aria-expanded={isReactionsOpen}
			>
				{#if isHandRaised}
					<span class="text-xl leading-none sm:text-2xl">✋</span>
				{:else}
					<Icon icon={SmileIcon} />
				{/if}
			</Button>

			{#if isReactionsOpen}
				<div
					class="bg-meet-panel border-meet-border absolute bottom-[calc(100%+8px)] left-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border p-2 shadow-xl max-sm:rounded-2xl sm:flex-nowrap sm:rounded-full sm:px-3"
				>
					<!-- Regular reaction emojis (auto-dismiss after 5 s) -->
					{#each REACTIONS as emoji (emoji)}
						<button
							class="flex size-10 cursor-pointer items-center justify-center rounded-full text-xl transition-transform hover:scale-125 sm:size-12 sm:text-2xl"
							onclick={() => {
								toggleReactions();
								lkState.sendReaction(emoji);
							}}
						>
							{emoji}
						</button>
					{/each}

					<!-- Divider -->
					<div class="bg-meet-border mx-1 h-px w-6 shrink-0 sm:h-6 sm:w-px"></div>

					<!-- Raise hand — persistent until dismissed -->
					<button
						class="flex size-10 cursor-pointer items-center justify-center rounded-full text-xl transition-transform hover:scale-125 sm:size-12 sm:text-2xl {isHandRaised
							? 'bg-meet-btn'
							: ''}"
						onclick={() => {
							toggleReactions();
							lkState.toggleRaiseHand();
						}}
						aria-label={isHandRaised ? t('control.lower_hand') : t('control.raise_hand')}
						title={isHandRaised ? t('control.lower_hand') : t('control.raise_hand')}
					>
						✋
					</button>

					<!-- Caret -->
					<div
						class="border-t-meet-border absolute -bottom-2 left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-b-0 border-solid border-x-transparent"
					></div>
					<div
						class="border-t-meet-panel absolute -bottom-1.75 left-1/2 -translate-x-1/2 border-x-[7px] border-t-[7px] border-b-0 border-solid border-x-transparent"
					></div>
				</div>
			{/if}
		</div>

		<!-- ── Settings ── -->
		<Button
			onclick={() => toggleSidebar('settings')}
			class="size-10 sm:size-12 {activeSidebar === 'settings'
				? 'bg-meet-btn-active text-meet-text'
				: ''}"
			size="icon-lg"
			variant="secondary"
			aria-label={t('control.settings')}
		>
			<Icon icon={Settings01Icon} />
		</Button>

		<!-- ── Leave ── -->
		<Button
			onclick={onLeave}
			class="bg-meet-red hover:bg-meet-red-hover h-10 shrink-0 rounded-full border-none px-4 text-sm font-medium text-white shadow-none sm:ml-2 sm:h-12 sm:px-6 sm:text-[15px]"
		>
			{t('control.leave')}
		</Button>
	</div>

	<!-- Desktop: balance -->
	<div class="hidden flex-1 sm:block"></div>
</div>
