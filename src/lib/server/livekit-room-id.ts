export const LIVEKIT_ROOM_MAX_LENGTH = 100;
/** Same rules as issuing join tokens ([a-z0-9][a-z0-9-]{1,98}[a-z0-9]). */
export const LIVEKIT_ROOM_ID_RE = /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/;

export function isValidLivekitRoomId(cleanRoom: string): boolean {
	return (
		cleanRoom.length > 0 &&
		cleanRoom.length <= LIVEKIT_ROOM_MAX_LENGTH &&
		LIVEKIT_ROOM_ID_RE.test(cleanRoom)
	);
}
