import {
	FilesetResolver,
	GestureRecognizer,
	type GestureRecognizerResult,
} from '@mediapipe/tasks-vision';

import {
	computeLetterboxLayout,
	mapLetterboxToVideoNormalized,
	mapNormalizedToCanvas,
	type LetterboxLayout,
} from './coordinates';
import { HandTracker } from './hand-tracker';
import {
	getIndexFingertip,
	shouldTrackIndexFinger,
	type HandLandmark,
} from './hand-pose';
import { MagicLineRenderer, STROKE_LIFETIME_MS } from './magic-line-renderer';
import type { StrokePalette } from './participant-color';
import { getParticipantStrokePalette } from './participant-color';
import type { OutboundMagicStroke } from './magic-stroke-sync';
import { StrokeBroadcaster } from './stroke-broadcaster';

const MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const INFER_SIZE = 480;
const DETECTION_COAST_MS = 450;
const MAX_PREDICT_AFTER_DETECT_MS = 600;

type HandMotion = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	lastDetectMs: number;
};

type HandTrackState = {
	tracking: boolean;
	lastOpenMs: number;
	strokeId: string;
};

/** Runs MediaPipe gesture recognition on a video element and drives magic-line drawing. */
export class GestureEngine {
	private recognizer: GestureRecognizer | null = null;
	private running = false;
	private rafId: number | null = null;
	private lineRenderer: MagicLineRenderer | null = null;
	private broadcaster: StrokeBroadcaster | null = null;
	private handTracker = new HandTracker();
	private resizeObserver: ResizeObserver | null = null;
	private onVideoMetadata: (() => void) | null = null;
	private handMotion = new Map<number, HandMotion>();
	private handTrackState = new Map<number, HandTrackState>();
	private activeHandIds = new Set<number>();
	private prevActiveHandIds = new Set<number>();
	private inferCanvas: HTMLCanvasElement | null = null;
	private letterboxLayout: LetterboxLayout | null = null;
	private isDetecting = false;

	constructor(
		private readonly video: HTMLVideoElement,
		private readonly canvas: HTMLCanvasElement,
		private readonly mirrored: boolean,
		private readonly onStrokeBatch?: (batch: OutboundMagicStroke) => void,
		private readonly palette: StrokePalette = getParticipantStrokePalette('local'),
	) {}

	/** Initialize MediaPipe and start the detection loop. */
	async start(): Promise<void> {
		if (this.running) {
			return;
		}

		this.lineRenderer = new MagicLineRenderer(this.canvas, this.palette);
		if (this.onStrokeBatch) {
			this.broadcaster = new StrokeBroadcaster((batch) => this.onStrokeBatch?.(batch));
		}
		this.inferCanvas = document.createElement('canvas');
		this.syncCanvasSize();
		this.resizeObserver = new ResizeObserver(() => this.syncCanvasSize());
		this.resizeObserver.observe(this.video);
		this.onVideoMetadata = () => this.syncCanvasSize();
		this.video.addEventListener('loadedmetadata', this.onVideoMetadata);
		this.video.addEventListener('resize', this.onVideoMetadata);

		this.recognizer = await this.createRecognizer();
		this.running = true;
		this.loop();
	}

	/** Stop detection and release resources. */
	stop() {
		this.running = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.onVideoMetadata) {
			this.video.removeEventListener('loadedmetadata', this.onVideoMetadata);
			this.video.removeEventListener('resize', this.onVideoMetadata);
			this.onVideoMetadata = null;
		}
		this.broadcaster?.destroy();
		this.broadcaster = null;
		this.lineRenderer?.destroy();
		this.lineRenderer = null;
		this.inferCanvas = null;
		this.letterboxLayout = null;
		this.handTracker.reset();
		this.handMotion.clear();
		this.handTrackState.clear();
		this.activeHandIds.clear();
		this.prevActiveHandIds.clear();
		this.recognizer?.close();
		this.recognizer = null;
	}

	private syncCanvasSize() {
		const w = this.video.clientWidth;
		const h = this.video.clientHeight;
		if (w > 0 && h > 0) {
			this.lineRenderer?.resize(w, h);
		}

		if (this.inferCanvas && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
			this.inferCanvas.width = INFER_SIZE;
			this.inferCanvas.height = INFER_SIZE;
			this.letterboxLayout = computeLetterboxLayout(
				this.video.videoWidth,
				this.video.videoHeight,
				INFER_SIZE,
			);
		}
	}

	/** Draw the current video frame letterboxed into the square inference canvas. */
	private drawInferenceFrame(ctx: CanvasRenderingContext2D) {
		const layout = this.letterboxLayout;
		if (!layout) {
			return;
		}

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, INFER_SIZE, INFER_SIZE);
		ctx.drawImage(
			this.video,
			layout.offsetX,
			layout.offsetY,
			layout.drawWidth,
			layout.drawHeight,
		);
	}

	private async createRecognizer(): Promise<GestureRecognizer> {
		const wasmBase = new URL('/mediapipe/wasm', window.location.origin).href;
		const vision = await FilesetResolver.forVisionTasks(wasmBase, false);
		const modelResponse = await fetch(MODEL_URL);
		if (!modelResponse.ok) {
			throw new Error(`Failed to load gesture model: ${modelResponse.statusText}`);
		}
		const modelBuffer = await modelResponse.arrayBuffer();

		const baseOptions = {
			modelAssetBuffer: new Uint8Array(modelBuffer),
		};
		const shared = {
			numHands: 2,
			minHandDetectionConfidence: 0.5,
			minHandPresenceConfidence: 0.5,
			minTrackingConfidence: 0.5,
			runningMode: 'VIDEO' as const,
		};

		try {
			return await GestureRecognizer.createFromOptions(vision, {
				baseOptions: { ...baseOptions, delegate: 'GPU' },
				...shared,
			});
		} catch {
			return GestureRecognizer.createFromOptions(vision, {
				baseOptions: { ...baseOptions, delegate: 'CPU' },
				...shared,
			});
		}
	}

	private loop() {
		if (!this.running) {
			return;
		}

		this.rafId = requestAnimationFrame((now) => {
			if (!this.running || !this.lineRenderer) {
				return;
			}

			this.renderPredictedPositions(now);

			if (
				!this.isDetecting &&
				this.recognizer &&
				this.inferCanvas &&
				this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
				this.video.videoWidth > 0
			) {
				this.isDetecting = true;
				setTimeout(() => {
					if (!this.running || !this.recognizer) {
						this.isDetecting = false;
						return;
					}
					try {
						this.runDetection(performance.now());
					} catch (err: unknown) {
						console.error('Gesture detection error:', err);
					} finally {
						this.isDetecting = false;
					}
				}, 0);
			}

			this.loop();
		});
	}

	/** Extrapolate fingertip position from velocity between detections for instant visual response. */
	private renderPredictedPositions(nowMs: number) {
		if (!this.lineRenderer) {
			return;
		}

		for (const [handId, motion] of this.handMotion) {
			if (!this.activeHandIds.has(handId)) {
				continue;
			}

			const sinceDetect = nowMs - motion.lastDetectMs;
			if (sinceDetect > MAX_PREDICT_AFTER_DETECT_MS) {
				continue;
			}

			const elapsed = Math.min(sinceDetect, MAX_PREDICT_AFTER_DETECT_MS);
			const x = motion.x + motion.vx * (elapsed / 1000);
			const y = motion.y + motion.vy * (elapsed / 1000);
			this.lineRenderer.addPixelPoint(handId, x, y, nowMs);
		}

		for (const handId of this.prevActiveHandIds) {
			if (this.activeHandIds.has(handId)) {
				continue;
			}
			const state = this.handTrackState.get(handId);
			if (state?.strokeId) {
				this.broadcaster?.finalize(handId, Date.now() + STROKE_LIFETIME_MS);
			}
		}
		this.prevActiveHandIds = new Set(this.activeHandIds);

		this.lineRenderer.commitInactiveHands(this.activeHandIds, nowMs);
	}

	private runDetection(nowMs: number) {
		if (!this.recognizer || !this.inferCanvas || !this.lineRenderer) {
			return;
		}

		const ctx = this.inferCanvas.getContext('2d');
		if (!ctx) {
			return;
		}

		this.drawInferenceFrame(ctx);
		const result = this.recognizer.recognizeForVideo(this.inferCanvas, nowMs);
		this.handleResult(result, nowMs);
	}

	private updateHandMotion(handId: number, x: number, y: number, nowMs: number) {
		const prev = this.handMotion.get(handId);
		let vx = 0;
		let vy = 0;

		if (prev) {
			const dt = nowMs - prev.lastDetectMs;
			if (dt > 0) {
				vx = ((x - prev.x) / dt) * 1000;
				vy = ((y - prev.y) / dt)  * 1000;
				vx = prev.vx * 0.35 + vx * 0.65;
				vy = prev.vy * 0.35 + vy * 0.65;
			}
		}

		this.handMotion.set(handId, { x, y, vx, vy, lastDetectMs: nowMs });
	}

	private handleResult(result: GestureRecognizerResult, nowMs: number) {
		const frameActiveHands = new Set<number>();
		this.handTracker.prune(nowMs);

		if (!result.landmarks?.length) {
			this.coastActiveHands(frameActiveHands, nowMs);
			this.activeHandIds = frameActiveHands;
			return;
		}

		const seenHandIds = new Set<number>();

		const layout = this.letterboxLayout;
		if (!layout || !this.lineRenderer) {
			return;
		}

		for (let handIndex = 0; handIndex < result.landmarks.length; handIndex++) {
			const landmarks = result.landmarks[handIndex] as readonly HandLandmark[];
			const tip = getIndexFingertip(landmarks);
			const videoNorm = mapLetterboxToVideoNormalized(tip.x, tip.y, layout);
			if (!videoNorm) {
				continue;
			}

			const mapped = mapNormalizedToCanvas(
				videoNorm.nx,
				videoNorm.ny,
				this.video,
				this.canvas,
				this.mirrored,
			);
			const handId = this.handTracker.match(mapped.x, mapped.y, nowMs);

			const trackState = this.handTrackState.get(handId) ?? {
				tracking: false,
				lastOpenMs: 0,
				strokeId: '',
			};
			const wasTracking = trackState.tracking;
			const msSinceOpen = nowMs - trackState.lastOpenMs;
			const shouldTrack = shouldTrackIndexFinger(
				landmarks,
				trackState.tracking,
				msSinceOpen,
				DETECTION_COAST_MS,
			);

			if (shouldTrack) {
				if (!wasTracking) {
					trackState.strokeId = createStrokeId();
					this.broadcaster?.startStroke(handId, trackState.strokeId);
				}

				trackState.lastOpenMs = nowMs;
				this.updateHandMotion(handId, mapped.x, mapped.y, nowMs);
				this.lineRenderer.addPixelPoint(handId, mapped.x, mapped.y, nowMs);
				this.broadcaster?.push(handId, videoNorm.nx, videoNorm.ny);

				trackState.tracking = true;
				frameActiveHands.add(handId);
			} else {
				if (wasTracking && trackState.strokeId) {
					this.broadcaster?.finalize(handId, Date.now() + STROKE_LIFETIME_MS);
				}
				trackState.tracking = false;
			}

			this.handTrackState.set(handId, trackState);
			seenHandIds.add(handId);
		}

		this.coastUndetectedHands(frameActiveHands, seenHandIds, nowMs);
		this.expireInactiveTrackStates(nowMs);
		this.activeHandIds = frameActiveHands;
	}

	/** Keep drawing only when the hand briefly leaves the frame — not when the finger closes. */
	private coastActiveHands(frameActiveHands: Set<number>, nowMs: number) {
		this.coastUndetectedHands(frameActiveHands, new Set<number>(), nowMs);
	}

	/** Coast hands that were drawing but were not matched in the current detection frame. */
	private coastUndetectedHands(
		frameActiveHands: Set<number>,
		seenHandIds: ReadonlySet<number>,
		nowMs: number,
	) {
		for (const handId of this.activeHandIds) {
			if (frameActiveHands.has(handId) || seenHandIds.has(handId)) {
				continue;
			}
			const state = this.handTrackState.get(handId);
			if (state?.tracking && nowMs - state.lastOpenMs < DETECTION_COAST_MS) {
				frameActiveHands.add(handId);
			}
		}
	}

	private expireInactiveTrackStates(nowMs: number) {
		for (const [handId, state] of this.handTrackState) {
			if (!state.tracking && nowMs - state.lastOpenMs > DETECTION_COAST_MS) {
				this.handTrackState.delete(handId);
				this.handMotion.delete(handId);
			}
		}
	}
}

/** Creates a short unique id for a magic stroke segment. */
const createStrokeId = (): string =>
	crypto.getRandomValues(new Uint8Array(4)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
