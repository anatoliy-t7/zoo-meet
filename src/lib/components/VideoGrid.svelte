<script lang="ts">
	import { createMeetGrid } from '@thangdevalone/meeting-grid-layout-core';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import type { Participant } from 'livekit-client';
	import ParticipantTile from './ParticipantTile.svelte';

	let { lkState, hideSelf = false } = $props<{ lkState: LiveKitState; hideSelf?: boolean }>();

	let container = $state<HTMLDivElement | null>(null);
	let dimensions = $state({ width: 0, height: 0 });

	/** Observe container size changes and update dimensions */
	$effect(() => {
		if (!container) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			dimensions = { width, height };
		});
		observer.observe(container);
		return () => observer.disconnect();
	});

	/** Recompute grid whenever dimensions or participant count changes */
	let itemLayouts = $derived.by(() => {
		const { width, height } = dimensions;
		const participants: Participant[] = hideSelf
			? lkState.participants.filter((p: Participant) => !p.isLocal)
			: lkState.participants;
		const count = participants.length;

		if (!width || !height || !count) return [];

		const grid = createMeetGrid({
			dimensions: { width, height },
			count,
			aspectRatio: '16:9',
			gap: 12,
			layoutMode: 'gallery',
		});

		return participants.map((p, i) => {
			const pos = grid.getPosition(i);
			const size = grid.getItemDimensions(i);
			return { participant: p, top: pos.top, left: pos.left, width: size.width, height: size.height };
		});
	});

	function isActiveSpeaker(participant: Participant): boolean {
		return lkState.activeSpeakers.some((p: Participant) => p.sid === participant.sid);
	}
</script>

<div bind:this={container} class="relative w-full h-full">
	{#each itemLayouts as item (item.participant.sid || item.participant.identity)}
		<div
			class="absolute transition-all duration-300 ease-in-out"
			style="top:{item.top}px; left:{item.left}px; width:{item.width}px; height:{item.height}px;"
		>
			<ParticipantTile
				participant={item.participant}
				{lkState}
				isActiveSpeaker={isActiveSpeaker(item.participant)}
			/>
		</div>
	{/each}
</div>
