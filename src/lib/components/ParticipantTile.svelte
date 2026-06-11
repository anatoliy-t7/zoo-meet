<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { Track, type Participant } from 'livekit-client';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import GestureOverlay from '$lib/components/GestureOverlay.svelte';
	import RemoteGestureOverlay from '$lib/components/RemoteGestureOverlay.svelte';
	import { MicOff01Icon } from '@hugeicons/core-free-icons';
	import { page } from '$app/state';

	let t = $derived(page.data.t);

	let { participant, isActiveSpeaker, lkState } = $props<{
		participant: Participant;
		isActiveSpeaker: boolean;
		lkState: LiveKitState;
	}>();

	let videoElement = $state<HTMLVideoElement | null>(null);
	let audioElement = $state<HTMLAudioElement | null>(null);

	// Re-evaluate when trackChangeCount updates
	let videoTrack = $derived(
		(lkState.trackChangeCount, participant.getTrackPublication(Track.Source.Camera)?.videoTrack)
	);
	let screenTrack = $derived(
		(lkState.trackChangeCount,
		participant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack)
	);
	let audioTrack = $derived(
		(lkState.trackChangeCount, participant.getTrackPublication(Track.Source.Microphone)?.audioTrack)
	);
	let isAudioMuted = $derived((lkState.trackChangeCount, !participant.isMicrophoneEnabled));

	/** Floating emoji reaction active on this tile (auto-clears after 5 s). */
	let activeReaction = $derived(lkState.activeReactions.get(participant.identity) ?? null);
	/** Whether this participant has raised their hand. */
	let handRaised = $derived(lkState.raisedHands.has(participant.identity));

	$effect(() => {
		const track = screenTrack || videoTrack;
		if (videoElement && track) {
			track.attach(videoElement);
		}
		return () => {
			if (videoElement && track) {
				track.detach(videoElement);
			}
		};
	});

	$effect(() => {
		if (audioElement && audioTrack && !participant.isLocal) {
			audioTrack.attach(audioElement);
		}
		return () => {
			if (audioElement && audioTrack && !participant.isLocal) {
				audioTrack.detach(audioElement);
			}
		};
	});
</script>

<div
	class="bg-meet-card relative h-full w-full overflow-hidden rounded-2xl transition-all duration-200 {isActiveSpeaker
		? 'ring-brand ring-2'
		: ''}"
>
	{#if screenTrack || videoTrack}
		<video
			bind:this={videoElement}
			class="h-full w-full object-cover {participant.isLocal && !screenTrack ? '-scale-x-100' : ''}"
			autoplay
			muted={participant.isLocal}
			playsinline
		></video>
		{#if !screenTrack && videoTrack}
			{#if participant.isLocal && lkState.isGestureEnabled}
				<GestureOverlay {videoElement} {lkState} enabled={lkState.isGestureEnabled} mirrored />
			{:else if !participant.isLocal}
				<RemoteGestureOverlay
					{videoElement}
					participantIdentity={participant.identity}
					{lkState}
				/>
			{/if}
		{/if}
	{:else}
		<div class="bg-meet-card flex h-full w-full items-center justify-center">
			<div
				class="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold uppercase"
			>
				{(participant.name || participant.identity).charAt(0)}
			</div>
		</div>
	{/if}

	{#if !participant.isLocal}
		<audio bind:this={audioElement} autoplay></audio>
	{/if}

	<!-- Floating emoji reaction — fades in large, disappears after 5 s -->
	{#if activeReaction}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center"
			in:scale={{ start: 0.4, duration: 200 }}
			out:fade={{ duration: 400 }}
		>
			<span
				class="rounded-full bg-black/30 p-4 text-5xl leading-none backdrop-blur-sm"
				style="filter: drop-shadow(0 2px 8px rgba(0,0,0,.5))"
			>
				{activeReaction}
			</span>
		</div>
	{/if}

	<!-- Raised hand badge — top-left, persistent -->
	{#if handRaised}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 backdrop-blur-sm hover:bg-white/15
				{participant.isLocal ? 'hover:bg-brand-dark cursor-pointer' : ''}"
			title={participant.isLocal ? t('participant.lower_hand') : ''}
			onclick={() => {
				if (participant.isLocal) lkState.toggleRaiseHand();
			}}
		>
			<span class="text-4xl leading-none">✋</span>
			<span
				>{participant.isLocal
					? t('participant.you_hand')
					: (participant.name || participant.identity).split(' ')[0]}</span
			>
		</div>
	{/if}

	<!-- Name badge bottom-left -->
	<div class="absolute bottom-3 left-3">
		<div
			class="bg-meet-panel/80 text-meet-text flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm"
		>
			<span>{participant.name || participant.identity}{participant.isLocal ? t('participant.you') : ''}</span>
			{#if isAudioMuted}
				<Icon icon={MicOff01Icon} size={12} color="var(--color-meet-red)" />
			{/if}
		</div>
	</div>

	<!-- Muted indicator top-right -->
	{#if isAudioMuted}
		<div
			class="bg-meet-panel/80 absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm"
		>
			<Icon icon={MicOff01Icon} size={16} color="var(--color-meet-red)" />
		</div>
	{/if}
</div>
