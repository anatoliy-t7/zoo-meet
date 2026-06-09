import { mapNormalizedToCanvas } from './coordinates';
import type { MagicStrokeView } from './magic-stroke-sync';
import { getParticipantStrokePalette, type StrokePalette } from './participant-color';
import { SparkleEmitter } from './sparkle-particles';

export const STROKE_LIFETIME_MS = 5000;
const MIN_POINT_DISTANCE = 1;
const LINE_WIDTH = 12;
const SHADOW_BLUR = 20;
const STROKE_GRACE_MS = 650;
const SMOOTH_ALPHA = 0.45;

type Point = { x: number; y: number };

type Stroke = {
	readonly points: readonly Point[];
	readonly expiresAt: number;
};

/** Renders smooth glowing curves that flow organically rather than tracing every finger jitter. */
export class MagicLineRenderer {
	private strokes: Stroke[] = [];
	private activeStrokes = new Map<number, Point[]>();
	private smoothCursor = new Map<number, Point>();
	private lastActiveMs = new Map<number, number>();
	private remotePointCounts = new Map<number, number>();
	private burstFinalizedKeys = new Set<string>();
	private readonly sparkleEmitter: SparkleEmitter;
	private rafId: number | null = null;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly palette: StrokePalette = getParticipantStrokePalette('local'),
	) {
		this.sparkleEmitter = new SparkleEmitter(palette);
	}

	/** Resize canvas to match the overlay dimensions. */
	resize(width: number, height: number) {
		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width;
			this.canvas.height = height;
		}
	}

	/** Append a raw fingertip sample — filtered into a smooth flowing curve per hand. */
	addPixelPoint(handId: number, rawX: number, rawY: number, nowMs = Date.now()) {
		const smoothed = this.filterPoint(handId, rawX, rawY);
		const stroke = this.activeStrokes.get(handId) ?? [];
		const last = stroke.at(-1);

		if (last) {
			const dist = Math.hypot(last.x - smoothed.x, last.y - smoothed.y);
			if (dist < MIN_POINT_DISTANCE) {
				this.lastActiveMs.set(handId, nowMs);
				return;
			}
		}

		stroke.push(smoothed);
		this.activeStrokes.set(handId, stroke);
		this.lastActiveMs.set(handId, nowMs);
		this.sparkleEmitter.emit(smoothed.x, smoothed.y, 4);
		this.scheduleDraw();
	}

	/** Finalize strokes only after a hand has been inactive longer than the grace window. */
	commitInactiveHands(activeHandIds: ReadonlySet<number>, nowMs = Date.now()) {
		for (const handId of activeHandIds) {
			this.lastActiveMs.set(handId, nowMs);
		}

		for (const [handId, points] of this.activeStrokes) {
			const lastActive = this.lastActiveMs.get(handId) ?? 0;
			if (nowMs - lastActive < STROKE_GRACE_MS) {
				continue;
			}
			this.finalizeStroke(points);
			this.activeStrokes.delete(handId);
			this.smoothCursor.delete(handId);
			this.lastActiveMs.delete(handId);
		}

		this.scheduleDraw();
	}

	/** Remove all strokes and stop rendering. */
	clear() {
		this.strokes = [];
		this.activeStrokes.clear();
		this.smoothCursor.clear();
		this.lastActiveMs.clear();
		this.remotePointCounts.clear();
		this.burstFinalizedKeys.clear();
		this.sparkleEmitter.clear();
		this.cancelDraw();
		const ctx = this.canvas.getContext('2d');
		if (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}

	destroy() {
		this.clear();
	}

	/** Rebuild canvas strokes from a remote participant's shared magic-line snapshot. */
	syncRemoteView(
		view: MagicStrokeView | undefined,
		video: HTMLVideoElement,
		mirrored: boolean,
	) {
		this.activeStrokes.clear();
		this.smoothCursor.clear();
		this.strokes = [];

		if (!view) {
			this.remotePointCounts.clear();
			this.burstFinalizedKeys.clear();
			this.cancelDraw();
			const ctx = this.canvas.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			}
			return;
		}

		const activeHandIds = new Set<number>();

		for (const active of view.active) {
			activeHandIds.add(active.handId);
			const pixels = active.points.map((p) =>
				mapNormalizedToCanvas(p.nx, p.ny, video, this.canvas, mirrored),
			);
			if (pixels.length > 0) {
				const previousCount = this.remotePointCounts.get(active.handId) ?? 0;
				if (pixels.length > previousCount) {
					for (let i = previousCount; i < pixels.length; i++) {
						const point = pixels[i]!;
						this.sparkleEmitter.emit(point.x, point.y, 2);
					}
				}
				this.remotePointCounts.set(active.handId, pixels.length);
				this.activeStrokes.set(active.handId, pixels);
			}
		}

		for (const handId of [...this.remotePointCounts.keys()]) {
			if (!activeHandIds.has(handId)) {
				this.remotePointCounts.delete(handId);
			}
		}

		for (const finalized of view.finalized) {
			const pixels = finalized.points.map((p) =>
				mapNormalizedToCanvas(p.nx, p.ny, video, this.canvas, mirrored),
			);
			if (pixels.length >= 2) {
				this.strokes.push({ points: pixels, expiresAt: finalized.expiresAt });

				const first = finalized.points[0];
				const burstKey = `${finalized.expiresAt}:${finalized.points.length}:${first?.nx ?? 0}:${first?.ny ?? 0}`;
				if (!this.burstFinalizedKeys.has(burstKey)) {
					this.burstFinalizedKeys.add(burstKey);
					this.sparkleEmitter.burstAlongStroke(pixels, 6);
				}
			}
		}

		this.scheduleDraw();
	}

	/** Exponential moving average — softens jitter into flowing motion. */
	private filterPoint(handId: number, x: number, y: number): Point {
		const prev = this.smoothCursor.get(handId);
		if (!prev) {
			const point = { x, y };
			this.smoothCursor.set(handId, point);
			return point;
		}

		const smoothed = {
			x: prev.x + (x - prev.x) * SMOOTH_ALPHA,
			y: prev.y + (y - prev.y) * SMOOTH_ALPHA,
		};
		this.smoothCursor.set(handId, smoothed);
		return smoothed;
	}

	private finalizeStroke(points: readonly Point[]) {
		if (points.length < 2) {
			return;
		}

		this.strokes.push({
			points: [...points],
			expiresAt: Date.now() + STROKE_LIFETIME_MS,
		});
		this.sparkleEmitter.burstAlongStroke(points, 8);
	}

	private scheduleDraw() {
		if (this.rafId !== null) {
			return;
		}
		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.draw();
		});
	}

	private cancelDraw() {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private draw() {
		const ctx = this.canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const now = Date.now();
		this.strokes = this.strokes.filter((stroke) => stroke.expiresAt > now);
		this.sparkleEmitter.update(now);

		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		for (const stroke of this.strokes) {
			const age = now - (stroke.expiresAt - STROKE_LIFETIME_MS);
			const lifeRatio = 1 - age / STROKE_LIFETIME_MS;
			this.drawSmoothStroke(ctx, stroke.points, lifeRatio);
		}

		for (const points of this.activeStrokes.values()) {
			if (points.length >= 2) {
				this.drawSmoothStroke(ctx, points, 1);
			} else if (points.length === 1) {
				this.drawStrokeTip(ctx, points[0]!, 1);
			}

			const tip = points.at(-1);
			if (tip && Math.random() < 0.4) {
				this.sparkleEmitter.emit(tip.x, tip.y, 1);
			}
		}

		this.sparkleEmitter.draw(ctx);

		const hasActive = [...this.activeStrokes.values()].some((points) => points.length >= 2);
		if (this.strokes.length > 0 || hasActive || this.sparkleEmitter.hasParticles) {
			this.scheduleDraw();
		}
	}

	/** Draw a glowing dot at the fingertip before the stroke has enough points for a curve. */
	private drawStrokeTip(ctx: CanvasRenderingContext2D, point: Point, opacity: number) {
		ctx.save();
		ctx.globalAlpha = opacity;
		ctx.fillStyle = this.palette.mid;
		ctx.shadowColor = this.palette.glow;
		ctx.shadowBlur = SHADOW_BLUR;
		ctx.beginPath();
		ctx.arc(point.x, point.y, LINE_WIDTH / 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/** Draw a flowing curve using Chaikin smoothing + Catmull-Rom splines. */
	private drawSmoothStroke(ctx: CanvasRenderingContext2D, points: readonly Point[], opacity: number) {
		const curve = chaikinSmooth([...points], 2);
		if (curve.length < 2) {
			return;
		}

		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = LINE_WIDTH;
		ctx.globalAlpha = opacity;

		const gradient = ctx.createLinearGradient(
			curve[0].x,
			curve[0].y,
			curve.at(-1)!.x,
			curve.at(-1)!.y,
		);
		gradient.addColorStop(0, this.palette.start);
		gradient.addColorStop(0.5, this.palette.mid);
		gradient.addColorStop(1, this.palette.end);

		ctx.strokeStyle = gradient;
		ctx.shadowColor = this.palette.glow;
		ctx.shadowBlur = SHADOW_BLUR;

		drawCatmullRomPath(ctx, curve);
		ctx.stroke();
		ctx.restore();
	}
}

/** Chaikin's corner-cutting — rounds sharp turns into soft arcs. */
const chaikinSmooth = (points: readonly Point[], iterations: number): Point[] => {
	let result = points.map((p) => ({ x: p.x, y: p.y }));

	for (let iter = 0; iter < iterations; iter++) {
		if (result.length < 2) {
			return result;
		}

		const next: Point[] = [result[0]];
		for (let i = 0; i < result.length - 1; i++) {
			const p0 = result[i];
			const p1 = result[i + 1];
			next.push(
				{ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 },
				{ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 },
			);
		}
		next.push(result.at(-1)!);
		result = next;
	}

	return result;
};

/** Build a smooth Catmull-Rom spline path through the given points. */
const drawCatmullRomPath = (ctx: CanvasRenderingContext2D, points: readonly Point[]) => {
	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y);

	if (points.length === 2) {
		ctx.lineTo(points[1].x, points[1].y);
		return;
	}

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;

		ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
	}
};
