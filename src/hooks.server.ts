import type { Handle } from '@sveltejs/kit';

const SECURITY_HEADERS: Record<string, string> = {
	// Prevent framing (clickjacking)
	'X-Frame-Options': 'DENY',
	'Content-Security-Policy': "frame-ancestors 'none'",

	// Prevent MIME-type sniffing
	'X-Content-Type-Options': 'nosniff',

	// Referrer policy — don't leak room IDs to third parties
	'Referrer-Policy': 'strict-origin-when-cross-origin',

	// Permissions policy — restrict unused browser features
	'Permissions-Policy': 'camera=self, microphone=self, display-capture=self, geolocation=(), payment=()',

	// HSTS — enable when behind HTTPS in production
	// 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(header, value);
	}

	return response;
};
