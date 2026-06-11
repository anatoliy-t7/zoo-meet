<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { MagicLineRenderer } from '$lib/gestures/magic-line-renderer';
	import { emptyMagicStrokeView } from '$lib/gestures/magic-stroke-sync';
	import { getParticipantStrokePalette } from '$lib/gestures/participant-color';
	import type { LiveKitState } from '$lib/livekit/store.svelte';

	let {
		videoElement = null,
		participantIdentity,
		lkState,
		mirrored = false,
	} = $props<{
		videoElement: HTMLVideoElement | null;
		participantIdentity: string;
		lkState: LiveKitState;
		mirrored?: boolean;
	}>();

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let renderer = $state<MagicLineRenderer | null>(null);
	let resizeObserver: ResizeObserver | null = null;

	let strokeView = $derived(
		lkState.magicStrokes.get(participantIdentity) ?? emptyMagicStrokeView(),
	);
	let strokePalette = $derived(getParticipantStrokePalette(participantIdentity));

	const syncCanvasSize = () => {
		if (!videoElement || !renderer) {
			return;
		}
		const w = videoElement.clientWidth;
		const h = videoElement.clientHeight;
		if (w > 0 && h > 0) {
			renderer.resize(w, h);
		}
	};

	$effect(() => {
		const video = videoElement;
		const palette = strokePalette;

		if (!video) {
			renderer?.destroy();
			renderer = null;
			return;
		}

		let cancelled = false;

		void (async () => {
			await tick();
			if (cancelled || !canvasElement) {
				return;
			}

			const currentRenderer = new MagicLineRenderer(canvasElement, palette);
			renderer = currentRenderer;
			syncCanvasSize();

			// Apply any stroke data that arrived while the renderer was being set up.
			// strokeView is read here (outside a reactive context) just to flush pending data.
			currentRenderer.syncRemoteView(strokeView, video, mirrored);

			resizeObserver = new ResizeObserver(() => {
				syncCanvasSize();
				// Re-render after resize so strokes previously mapped to 0×0 are redrawn correctly.
				currentRenderer.syncRemoteView(strokeView, video, mirrored);
			});
			resizeObserver.observe(video);

			const onMetadata = () => {
				syncCanvasSize();
				currentRenderer.syncRemoteView(strokeView, video, mirrored);
			};
			video.addEventListener('loadedmetadata', onMetadata);
			video.addEventListener('resize', onMetadata);
		})();

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
			resizeObserver = null;
			renderer?.destroy();
			renderer = null;
		};
	});

	$effect(() => {
		const video = videoElement;
		const view = strokeView;
		const currentRenderer = renderer;
		if (!video || !currentRenderer) {
			return;
		}
		syncCanvasSize();
		currentRenderer.syncRemoteView(view, video, mirrored);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
		renderer?.destroy();
		renderer = null;
	});
</script>

<canvas
	bind:this={canvasElement}
	class="pointer-events-none absolute inset-0 z-[1] h-full w-full"
	aria-hidden="true"
></canvas>
