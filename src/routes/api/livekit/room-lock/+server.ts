import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { livekitClientUrlToHttpApiUrl } from '$lib/livekit/livekit-http-url';
import { mergeMeetingRoomLock } from '$lib/livekit/meeting-room-metadata';
import { LIVEKIT_ROOM_MAX_LENGTH, isValidLivekitRoomId } from '$lib/server/livekit-room-id';
import { RoomServiceClient, TokenVerifier, type ClaimGrants } from 'livekit-server-sdk';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const roomLockSchema = z.object({
	room: z.string(),
	locked: z.boolean(),
});

/**
 * Persist meeting lock state in LiveKit room metadata (same source enforced at token issuance).
 * Requires Bearer token from `/api/livekit/token` — must include roomJoin grant for `room`.
 */
export const POST: RequestHandler = async ({ request }) => {
	const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY;
	const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET;

	if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
		return json({ error: 'Server misconfigured' }, { status: 500 });
	}

	const lkHttpUrl = livekitClientUrlToHttpApiUrl(publicEnv.PUBLIC_LIVEKIT_URL ?? '');
	if (!lkHttpUrl) {
		return json({ error: 'PUBLIC_LIVEKIT_URL is required for room locking' }, { status: 500 });
	}

	const authHeader = request.headers.get('authorization');
	const bearer = /^Bearer\s+(.+)$/i.exec(authHeader ?? '');
	const jwt = bearer?.[1];
	if (!jwt) {
		return json({ error: 'Missing Bearer token' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const parsed = roomLockSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid body' }, { status: 400 });
	}

	const cleanRoom = parsed.data.room.trim();
	if (!cleanRoom || cleanRoom.length > LIVEKIT_ROOM_MAX_LENGTH) {
		return json({ error: 'Invalid room name' }, { status: 400 });
	}

	if (!isValidLivekitRoomId(cleanRoom)) {
		return json({ error: 'Invalid room name' }, { status: 400 });
	}

	let claims: ClaimGrants;
	try {
		const verifier = new TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		claims = await verifier.verify(jwt);
	} catch {
		return json({ error: 'Invalid or expired token' }, { status: 401 });
	}

	const joinedRoom = claims.video?.room;
	if (!claims.video?.roomJoin || typeof joinedRoom !== 'string' || joinedRoom !== cleanRoom) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const roomSvc = new RoomServiceClient(lkHttpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
		const rooms = await roomSvc.listRooms([cleanRoom]);
		const active = rooms[0];
		if (!active) {
			return json({ ok: true, synced: false });
		}

		const nextMeta = mergeMeetingRoomLock(active.metadata, parsed.data.locked);
		await roomSvc.updateRoomMetadata(cleanRoom, nextMeta);
		return json({ ok: true, synced: true });
	} catch (e) {
		console.error('Room lock metadata update failed:', e);
		return json({ error: 'Could not update room lock' }, { status: 502 });
	}
};
