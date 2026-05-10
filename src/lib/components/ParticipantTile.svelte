<script lang="ts">
	import { Track, type Participant } from 'livekit-client';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { MicOff01Icon } from '@hugeicons/core-free-icons';

	let { participant, isActiveSpeaker, lkState } = $props<{ participant: Participant; isActiveSpeaker: boolean; lkState: LiveKitState }>();

	let videoElement = $state<HTMLVideoElement | null>(null);
	let audioElement = $state<HTMLAudioElement | null>(null);

	// Re-evaluate when trackChangeCount updates
	let videoTrack = $derived((lkState.trackChangeCount, participant.getTrackPublication(Track.Source.Camera)?.videoTrack));
	let screenTrack = $derived((lkState.trackChangeCount, participant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack));
	let audioTrack = $derived((lkState.trackChangeCount, participant.getTrackPublication(Track.Source.Microphone)?.audioTrack));
	let isAudioMuted = $derived((lkState.trackChangeCount, !participant.isMicrophoneEnabled));

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
	class="relative w-full h-full bg-meet-card rounded-2xl overflow-hidden transition-all duration-200 {isActiveSpeaker ? 'ring-2 ring-brand-500' : ''}"
>
	{#if screenTrack || videoTrack}
		<video
			bind:this={videoElement}
			class="w-full h-full object-cover {participant.isLocal && !screenTrack ? '-scale-x-100' : ''}"
			autoplay
			muted={participant.isLocal}
			playsinline
		></video>
	{:else}
		<div class="w-full h-full flex items-center justify-center bg-meet-card">
			<div class="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-white text-3xl font-bold uppercase">
				{participant.identity.charAt(0)}
			</div>
		</div>
	{/if}

	{#if !participant.isLocal}
		<audio bind:this={audioElement} autoplay></audio>
	{/if}

	<!-- Name badge bottom-left -->
	<div class="absolute bottom-3 left-3">
		<div class="bg-meet-panel/80 backdrop-blur-sm text-meet-text text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
			<span>{participant.identity}{participant.isLocal ? ' (You)' : ''}</span>
			{#if isAudioMuted}
				<Icon icon={MicOff01Icon} size={12} color="var(--color-meet-red)" />
			{/if}
		</div>
	</div>

	<!-- Muted indicator top-right -->
	{#if isAudioMuted}
		<div class="absolute top-3 right-3 bg-meet-panel/80 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center">
			<Icon icon={MicOff01Icon} size={16} color="var(--color-meet-red)" />
		</div>
	{/if}
</div>
