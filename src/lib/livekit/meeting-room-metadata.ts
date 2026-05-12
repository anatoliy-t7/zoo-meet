import { z } from 'zod';

/** JSON shape LiveKit persists on Room.metadata (`updateRoomMetadata`). */
const meetingRoomMetadataSchema = z.object({
	locked: z.boolean().optional(),
});

export function isMeetingRoomLockedFromMetadata(metadataJson: string | undefined): boolean {
	if (!metadataJson?.trim()) {
		return false;
	}
	let raw: unknown;
	try {
		raw = JSON.parse(metadataJson);
	} catch {
		return false;
	}
	const parsed = meetingRoomMetadataSchema.safeParse(raw);
	return parsed.success && parsed.data.locked === true;
}

/** Merges `locked` into existing JSON metadata without dropping unknown keys LiveKit carries. */
export function mergeMeetingRoomLock(metadataJson: string | undefined, locked: boolean): string {
	const recordSchema = z.record(z.string(), z.unknown());
	let base: Record<string, unknown> = {};
	if (metadataJson?.trim()) {
		try {
			const raw: unknown = JSON.parse(metadataJson);
			const parsed = recordSchema.safeParse(raw);
			if (parsed.success) {
				base = { ...parsed.data };
			}
		} catch {
			// Malformed metadata — start from empty object
		}
	}

	if (locked) {
		base.locked = true;
	} else {
		delete base.locked;
	}

	return JSON.stringify(base);
}
