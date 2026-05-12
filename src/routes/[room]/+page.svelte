<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { createLiveKitState } from '$lib/livekit/store.svelte';
	import { deriveE2EEKey } from '$lib/utils/e2ee';
	import { Track, type LocalVideoTrack, type LocalAudioTrack } from 'livekit-client';
	import PreJoin from '$lib/components/PreJoin.svelte';
	import Room from '$lib/components/Room.svelte';
	import { onDestroy } from 'svelte';
	import { z } from 'zod';

	import type { PageData } from './$types';

	const tokenIssueOkSchema = z.object({
		token: z.string().min(1),
	});

	const tokenIssueErrSchema = z.object({
		error: z.string().optional(),
	});

	let { data }: { data: PageData } = $props();

	let t = $derived(page.data.t);

	const roomId = page.params.room ?? '';

	let lkState = createLiveKitState();
	let joined = $state(false);
	let error = $state<string | null>(null);

	async function handleJoin(
		name: string,
		videoTrack?: LocalVideoTrack,
		audioTrack?: LocalAudioTrack
	) {
		try {
			if (!data.publicLivekitUrl) {
				throw new Error('LiveKit URL is not configured');
			}

			const [res, e2eeKey] = await Promise.all([
				fetch('/api/livekit/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ room: roomId, participantName: name }),
				}),
				deriveE2EEKey(roomId),
			]);

			if (!res.ok) {
				let message = `Failed to get token (${res.status})`;
				let rawErr: unknown;
				try {
					rawErr = await res.json();
				} catch {
					rawErr = {};
				}
				const parsed = tokenIssueErrSchema.safeParse(rawErr);
				if (parsed.success && parsed.data.error?.trim()) {
					message = parsed.data.error.trim();
				}
				throw new Error(message);
			}

			const raw: unknown = await res.json();
			const parsedToken = tokenIssueOkSchema.safeParse(raw);
			if (!parsedToken.success) {
				throw new Error('Invalid token response');
			}
			const { token } = parsedToken.data;

			await lkState.connect(data.publicLivekitUrl, token, roomId, e2eeKey);

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
	<title>{t('room.page_title', { brandName: data.publicBrandName, roomId })}</title>
	<meta
		name="description"
		content={t('room.meta_description', { brandName: data.publicBrandName })}
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta property="og:title" content={t('room.og_title', { brandName: data.publicBrandName })} />
	<meta
		property="og:description"
		content={t('room.og_description', { brandName: data.publicBrandName })}
	/>
	<meta property="og:image" content="/hero.webp" />
</svelte:head>

{#if !joined}
	{#if error}
		<div class="bg-meet-bg text-meet-text fixed inset-0 z-50 flex items-center justify-center">
			<div class="bg-meet-panel border-meet-border max-w-md rounded-3xl border p-6 text-center">
				<h2 class="mb-2 text-xl font-semibold">{t('room.connection_error')}</h2>
				<p class="text-meet-text-muted mb-4">{error}</p>
				<button
					onclick={() => goto('/')}
					class="bg-meet-text text-meet-bg hover:bg-meet-text-muted rounded-full px-6 py-2 font-medium transition-colors"
				>
					{t('room.go_back')}
				</button>
			</div>
		</div>
	{/if}
	<PreJoin onJoin={handleJoin} />
{:else}
	<Room {lkState} onLeave={handleLeave} />
{/if}
