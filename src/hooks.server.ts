import { getLocale } from '$lib/i18n';
import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS: Record<string, string> = {
	// Prevent framing (clickjacking)
	'X-Frame-Options': 'DENY',
	// frame-ancestors blocks embedding; connect-src allows:
	//   wss:/ws:  — LiveKit WebRTC signaling
	//   storage.googleapis.com — MediaPipe gesture model download
	'Content-Security-Policy':
		"frame-ancestors 'none'; connect-src 'self' wss: ws: https://storage.googleapis.com",

	// Prevent MIME-type sniffing
	'X-Content-Type-Options': 'nosniff',

	// Referrer policy — don't leak room IDs to third parties
	'Referrer-Policy': 'strict-origin-when-cross-origin',

	// Permissions policy — restrict unused browser features
	'Permissions-Policy':
		'camera=self, microphone=self, display-capture=self, geolocation=(), payment=()',

	// HSTS — requires HTTPS in production; remove or disable for local HTTP dev
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = getLocale(event);

	const response = await resolve(event);

	for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(header, value);
	}

	return response;
};
