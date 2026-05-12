/**
 * Convert a LiveKit client URL (`wss://` / `ws://` / `https://`) into the HTTPS (or HTTP) base URL
 * used by LiveKit Twirp RoomService APIs.
 */
export function livekitClientUrlToHttpApiUrl(wsOrHttpUrl: string): string | null {
	const trimmed = wsOrHttpUrl.trim();
	if (!trimmed) {
		return null;
	}

	try {
		const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
		if (url.protocol === 'wss:') {
			url.protocol = 'https:';
		} else if (url.protocol === 'ws:') {
			url.protocol = 'http:';
		}
		url.pathname = '';
		url.hash = '';
		url.search = '';
		const href = url.toString();
		return href.endsWith('/') ? href.slice(0, -1) : href;
	} catch {
		return null;
	}
}
