import { env } from '$env/dynamic/private';
import { AccessToken } from 'livekit-server-sdk';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_NAME_LENGTH = 100;
const MAX_ROOM_LENGTH = 100;
const VALID_ROOM_RE = /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/;

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
		if (cleanRoom.length > MAX_ROOM_LENGTH || cleanName.length > MAX_NAME_LENGTH) {
			return json({ error: 'room or participantName too long' }, { status: 400 });
		}
		if (!VALID_ROOM_RE.test(cleanRoom)) {
			return json({ error: 'Invalid room name' }, { status: 400 });
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
