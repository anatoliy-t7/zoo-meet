type HandSlot = {
	readonly id: number;
	x: number;
	y: number;
	lastSeenMs: number;
};

const MATCH_DISTANCE_PX = 180;
const SLOT_TTL_MS = 500;

/** Assigns stable hand ids across frames by matching fingertip proximity. */
export class HandTracker {
	private slots: HandSlot[] = [];
	private nextId = 0;

	/** Resolve a stable id for a fingertip position at the given time. */
	match(x: number, y: number, nowMs: number): number {
		let bestId = -1;
		let bestDist = MATCH_DISTANCE_PX;

		for (const slot of this.slots) {
			const dist = Math.hypot(slot.x - x, slot.y - y);
			if (dist < bestDist) {
				bestDist = dist;
				bestId = slot.id;
			}
		}

		if (bestId === -1) {
			bestId = this.nextId++;
			this.slots.push({ id: bestId, x, y, lastSeenMs: nowMs });
			return bestId;
		}

		const slot = this.slots.find((s) => s.id === bestId);
		if (slot) {
			slot.x = x;
			slot.y = y;
			slot.lastSeenMs = nowMs;
		}

		return bestId;
	}

	/** Drop stale slots so ids can be recycled after hands leave the frame. */
	prune(nowMs: number) {
		this.slots = this.slots.filter((slot) => nowMs - slot.lastSeenMs < SLOT_TTL_MS);
	}

	reset() {
		this.slots = [];
		this.nextId = 0;
	}
}
