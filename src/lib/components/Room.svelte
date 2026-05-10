<script lang="ts">
	import { fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import VideoGrid from './VideoGrid.svelte';
	import ControlBar from './ControlBar.svelte';
	import Chat from './Chat.svelte';
	import Settings from './Settings.svelte';
	import Info from './Info.svelte';
	import ParticipantTile from './ParticipantTile.svelte';
	import Icon from './Icon.svelte';
	import { LockPasswordIcon } from '@hugeicons/core-free-icons';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';

	let { lkState, onLeave } = $props<{ lkState: LiveKitState; onLeave: () => void }>();

	type Sidebar = 'chat' | 'settings' | 'info' | 'participants' | null;

	let activeSidebar = $state<Sidebar>(null);
	let isReactionsOpen = $state(false);
	let showLeaveDialog = $state(false);
	// Owned here so VideoGrid and floating PiP can react
	let hideSelf = $state(false);
	let floatingThumbnail = $state(true);

	let localParticipant = $derived(
		(lkState.trackChangeCount, lkState.room?.localParticipant ?? null)
	);

	function toggleSidebar(panel: NonNullable<Sidebar>) {
		activeSidebar = activeSidebar === panel ? null : panel;
	}

	function toggleReactions() {
		isReactionsOpen = !isReactionsOpen;
	}

	/** Show the leave confirmation dialog instead of leaving immediately */
	function handleLeaveRequest() {
		showLeaveDialog = true;
	}

	/** Confirmed — actually leave */
	function handleLeaveConfirm() {
		showLeaveDialog = false;
		onLeave();
	}

	function handleStay() {
		showLeaveDialog = false;
	}

	function handleBeforeUnload(e: BeforeUnloadEvent) {
		e.preventDefault();
	}

	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);
	});

	onDestroy(() => {
		window.removeEventListener('beforeunload', handleBeforeUnload);
	});
</script>

<!-- Dismiss reactions popover on backdrop click; Escape handled on this region -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="main"
	class="bg-meet-bg text-meet-text flex h-screen w-full flex-col overflow-hidden font-sans"
	onclick={(e) => {
		if (isReactionsOpen && !(e.target as HTMLElement).closest('[data-reactions]'))
			isReactionsOpen = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape' && isReactionsOpen) isReactionsOpen = false;
	}}
>
	<!-- Video + Sidebar row -->
	<div class="relative flex min-h-0 flex-1 overflow-hidden">
		<!-- Main Video Area -->
		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Top status badges -->
			<div
				class="pointer-events-none absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2"
			>
				{#if lkState.isLocked}
					<div
						class="bg-meet-red/90 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
					>
						<Icon icon={LockPasswordIcon} size={13} />
						Meeting locked
					</div>
				{/if}
			</div>

			<div class="flex-1 overflow-hidden p-4 pb-0">
				<VideoGrid {lkState} {hideSelf} />
			</div>

			<!-- Floating self-view PiP while screensharing -->
			{#if lkState.isScreenSharing && floatingThumbnail && !hideSelf && localParticipant}
				<div
					class="absolute right-6 bottom-6 z-10 h-36 w-56 overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/20"
				>
					<ParticipantTile participant={localParticipant} {lkState} isActiveSpeaker={false} />
				</div>
			{/if}
		</div>

		{#if activeSidebar}
			<div
				class="bg-popover m-4 w-96 rounded-xl"
				transition:fly={{ x: 320, duration: 220, opacity: 1 }}
			>
				<!-- Sidebar panel -->
				{#if activeSidebar === 'chat'}
					<Chat {lkState} onClose={() => (activeSidebar = null)} />
				{:else if activeSidebar === 'settings'}
					<Settings
						onClose={() => (activeSidebar = null)}
						e2eeEnabled={lkState.e2eeEnabled}
						{lkState}
						{hideSelf}
						{floatingThumbnail}
						onHideSelfChange={(v) => (hideSelf = v)}
						onFloatingThumbnailChange={(v) => (floatingThumbnail = v)}
					/>
				{:else if activeSidebar === 'info' || activeSidebar === 'participants'}
					<Info {lkState} onClose={() => (activeSidebar = null)} />
				{/if}
			</div>
		{/if}
	</div>

	<!-- Control bar always at bottom -->
	<ControlBar
		{lkState}
		onLeave={handleLeaveRequest}
		{activeSidebar}
		{toggleSidebar}
		{toggleReactions}
		{isReactionsOpen}
	/>
</div>

<!-- Leave confirmation dialog -->
<Dialog.Root
	open={showLeaveDialog}
	onOpenChange={(open) => {
		if (!open) handleStay();
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure you want to leave?</Dialog.Title>
			<Dialog.Description>You will leave the meeting. Others will continue.</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-3 sm:flex-col">
			<Button onclick={handleLeaveConfirm} variant="destructive" size="lg" class="w-full">
				Leave meeting
			</Button>

			<Dialog.Close class={buttonVariants({ variant: 'secondary', size: 'lg' })}>
				Stay in meeting
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
