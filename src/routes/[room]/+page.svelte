<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createLiveKitState } from '$lib/livekit/store.svelte';
	import { deriveE2EEKey } from '$lib/utils/e2ee';
	import { Track, type LocalVideoTrack, type LocalAudioTrack } from 'livekit-client';
	import PreJoin from '$lib/components/PreJoin.svelte';
	import Room from '$lib/components/Room.svelte';
	import { onDestroy } from 'svelte';
	import { PUBLIC_LIVEKIT_URL } from '$env/static/public';

	const roomId = $page.params.room ?? '';

	let lkState = createLiveKitState();
	let joined = $state(false);
	let error = $state<string | null>(null);

	async function handleJoin(name: string, videoTrack?: LocalVideoTrack, audioTrack?: LocalAudioTrack) {
		try {
			const [res, e2eeKey] = await Promise.all([
				fetch('/api/livekit/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ room: roomId, participantName: name }),
				}),
				deriveE2EEKey(roomId),
			]);

			if (!res.ok) throw new Error('Failed to get token');

			const { token } = await res.json();

			await lkState.connect(PUBLIC_LIVEKIT_URL, token, e2eeKey);

			if (videoTrack && lkState.room) {
				await lkState.room.localParticipant.publishTrack(videoTrack, {
					source: Track.Source.Camera,
				});
			}
			if (audioTrack && lkState.room) {
				await lkState.room.localParticipant.publishTrack(audioTrack, {
					source: Track.Source.Microphone,
				});
			}

			joined = true;
		} catch (e: unknown) {
			console.error(e);
			error = e instanceof Error ? e.message : 'An error occurred';
		}
	}

	function handleLeave() {
		lkState.disconnect();
		goto('/');
	}

	onDestroy(() => {
		lkState.disconnect();
	});
</script>

<svelte:head>
	<title>Huddle - {roomId}</title>
</svelte:head>

{#if !joined}
	{#if error}
		<div class="bg-meet-bg text-meet-text fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-meet-panel border-meet-border rounded-3xl border p-6 text-center max-w-md">
				<h2 class="mb-2 text-xl font-semibold">Connection Error</h2>
				<p class="text-meet-text-muted mb-4">{error}</p>
				<button
					onclick={() => goto('/')}
					class="bg-meet-text text-meet-bg hover:bg-meet-text-muted rounded-full px-6 py-2 font-medium transition-colors"
				>
					Go Back
				</button>
			</div>
		</div>
	{/if}
	<PreJoin onJoin={handleJoin} />
{:else}
	<Room {lkState} onLeave={handleLeave} />
{/if}
