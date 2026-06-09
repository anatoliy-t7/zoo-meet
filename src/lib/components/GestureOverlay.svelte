<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import type { GestureEngine } from '$lib/gestures/gesture-engine';
	import { getParticipantStrokePalette } from '$lib/gestures/participant-color';
	import type { LiveKitState } from '$lib/livekit/store.svelte';

	let {
		videoElement = null,
		lkState,
		enabled = true,
		mirrored = true,
	} = $props<{
		videoElement: HTMLVideoElement | null;
		lkState: LiveKitState;
		enabled?: boolean;
		mirrored?: boolean;
	}>();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let engine: GestureEngine | null = null;

	let participantIdentity = $derived(lkState.room?.localParticipant?.identity ?? 'local');
	let strokePalette = $derived(getParticipantStrokePalette(participantIdentity));

	$effect(() => {
		const video = videoElement;
		const isEnabled = enabled;
		const palette = strokePalette;

		if (!isEnabled || !video) {
			engine?.stop();
			engine = null;
			return;
		}

		let cancelled = false;

		void (async () => {
			await tick();
			if (cancelled || !canvasElement) {
				return;
			}

			const { GestureEngine } = await import('$lib/gestures/gesture-engine');
			const currentEngine = new GestureEngine(
				video,
				canvasElement,
				mirrored,
				(batch) => lkState.publishMagicStroke(batch),
				palette,
			);
			engine = currentEngine;
			try {
				await currentEngine.start();
			} catch (err: unknown) {
				console.error('Gesture recognition failed to start:', err);
				if (engine === currentEngine) {
					engine = null;
				}
			}
		})();

		return () => {
			cancelled = true;
			engine?.stop();
			engine = null;
		};
	});

	onDestroy(() => {
		engine?.stop();
		engine = null;
	});
</script>

<canvas
	bind:this={canvasElement}
	class="pointer-events-none absolute inset-0 z-[1] h-full w-full"
	aria-hidden="true"
></canvas>
