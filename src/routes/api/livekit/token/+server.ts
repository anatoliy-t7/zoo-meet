import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { livekitClientUrlToHttpApiUrl } from '$lib/livekit/livekit-http-url';
import { isMeetingRoomLockedFromMetadata } from '$lib/livekit/meeting-room-metadata';
import { LIVEKIT_ROOM_MAX_LENGTH, isValidLivekitRoomId } from '$lib/server/livekit-room-id';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_NAME_LENGTH = 100;

/** Issues a short-lived LiveKit JWT for the given room + participant. */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY;
		const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET;

		if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
			return json({ error: 'Server misconfigured' }, { status: 500 });
		}

		const body: unknown = await request.json();
		if (typeof body !== 'object' || body === null) {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

		const { room, participantName } = body as Record<string, unknown>;

		const cleanRoom = typeof room === 'string' ? room.trim() : '';
		const cleanName = typeof participantName === 'string' ? participantName.trim() : '';

		if (!cleanRoom || !cleanName) {
			return json({ error: 'Missing room or participantName' }, { status: 400 });
		}
		if (cleanRoom.length > LIVEKIT_ROOM_MAX_LENGTH || cleanName.length > MAX_NAME_LENGTH) {
			return json({ error: 'room or participantName too long' }, { status: 400 });
		}
		if (!isValidLivekitRoomId(cleanRoom)) {
			return json({ error: 'Invalid room name' }, { status: 400 });
		}

		const lkHttpUrl = livekitClientUrlToHttpApiUrl(publicEnv.PUBLIC_LIVEKIT_URL ?? '');
		if (lkHttpUrl) {
			try {
				const roomSvc = new RoomServiceClient(lkHttpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
				const rooms = await roomSvc.listRooms([cleanRoom]);
				const existing = rooms[0];
				if (existing?.metadata !== undefined && isMeetingRoomLockedFromMetadata(existing.metadata)) {
					const participants = await roomSvc.listParticipants(cleanRoom);
					const alreadyInRoom = participants.some((p) => p.identity === cleanName);
					if (!alreadyInRoom) {
						return json({ error: 'Meeting is locked' }, { status: 403 });
					}
				}
			} catch (e) {
				console.warn('LiveKit locked-room check skipped due to RoomService error:', e);
			}
		}

		const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
			identity: cleanName,
			name: cleanName,
			ttl: '4h',
		});
		at.addGrant({ roomJoin: true, room: cleanRoom, canPublish: true, canSubscribe: true });

		return json({ token: await at.toJwt() });
	} catch (error) {
		console.error('Error generating token:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
