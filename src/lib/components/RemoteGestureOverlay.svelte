<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { MagicLineRenderer } from '$lib/gestures/magic-line-renderer';
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

	let strokeView = $derived(lkState.getMagicStrokes(participantIdentity));
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

			resizeObserver = new ResizeObserver(() => syncCanvasSize());
			resizeObserver.observe(video);

			const onMetadata = () => syncCanvasSize();
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
