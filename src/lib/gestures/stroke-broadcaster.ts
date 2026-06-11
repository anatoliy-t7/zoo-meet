import type { NormalizedPoint, OutboundMagicStroke } from './magic-stroke-sync';

const FLUSH_INTERVAL_MS = 80;
const MIN_NORMALIZED_DISTANCE = 0.006;

type StrokeBuffer = {
	readonly strokeId: string;
	points: NormalizedPoint[];
	/** True once at least one intermediate batch has been published for this stroke. */
	published: boolean;
	/** Last published point — used to send a minimal final packet when buffer is empty at finalize. */
	lastPoint?: NormalizedPoint;
};

/** Throttles and batches normalized stroke points before publishing over the data channel. */
export class StrokeBroadcaster {
	private buffers = new Map<number, StrokeBuffer>();
	private timers = new Map<number, ReturnType<typeof setTimeout>>();

	constructor(private readonly onPublish: (batch: OutboundMagicStroke) => void) {}

	/** Begin a new stroke segment for a hand. */
	startStroke(handId: number, strokeId: string) {
		this.clearTimer(handId);
		this.buffers.set(handId, { strokeId, points: [], published: false });
	}

	/** Queue a normalized fingertip sample for broadcast. */
	push(handId: number, nx: number, ny: number) {
		const buffer = this.buffers.get(handId);
		if (!buffer) {
			return;
		}

		const last = buffer.points.at(-1);
		if (last && Math.hypot(last.nx - nx, last.ny - ny) < MIN_NORMALIZED_DISTANCE) {
			return;
		}

		buffer.points.push({ nx, ny });
		this.scheduleFlush(handId);
	}

	/** Publish any remaining points and mark the stroke complete. */
	finalize(handId: number, expiresAt: number) {
		this.flush(handId, true, expiresAt);
		this.buffers.delete(handId);
		this.clearTimer(handId);
	}

	destroy() {
		for (const handId of this.timers.keys()) {
			this.clearTimer(handId);
		}
		this.buffers.clear();
	}

	private scheduleFlush(handId: number) {
		if (this.timers.has(handId)) {
			return;
		}

		const timer = setTimeout(() => {
			this.timers.delete(handId);
			this.flush(handId, false);
		}, FLUSH_INTERVAL_MS);
		this.timers.set(handId, timer);
	}

	private flush(handId: number, final: boolean, expiresAt?: number) {
		const buffer = this.buffers.get(handId);
		if (!buffer) {
			return;
		}

		if (buffer.points.length === 0) {
			if (final && buffer.published) {
				// The remote has an open active entry for this stroke (we sent at least one
				// intermediate batch) but we have no new points. Re-send the last known point
				// as the final packet so the remote store closes and finalizes the stroke.
				const lastPoint = buffer.lastPoint;
				if (lastPoint) {
					this.onPublish({
						handId,
						strokeId: buffer.strokeId,
						points: [lastPoint],
						final: true,
						expiresAt,
					});
				}
			}
			return;
		}

		const lastPoint = buffer.points.at(-1)!;
		const batch: OutboundMagicStroke = {
			handId,
			strokeId: buffer.strokeId,
			points: [...buffer.points],
			...(final ? { final: true, expiresAt } : {}),
		};
		this.onPublish(batch);
		buffer.points = [];
		buffer.published = true;
		buffer.lastPoint = lastPoint;
	}

	private clearTimer(handId: number) {
		const timer = this.timers.get(handId);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(handId);
		}
	}
}
