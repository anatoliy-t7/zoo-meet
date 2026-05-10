const ENC = new TextEncoder();
const SALT = ENC.encode('ZooMeet-e2ee-v1');
const INFO = ENC.encode('e2ee-room-key');

/**
 * Derives a 128-bit E2EE key from the room ID using HKDF-SHA-256.
 * The room ID is already the shared secret (it's in the URL), so anyone
 * with the meeting link can decrypt — matching the access-control model.
 * The key is returned as a base64url string for use with LiveKit's ExternalE2EEKeyProvider.
 */
export async function deriveE2EEKey(roomId: string): Promise<string> {
	const keyMaterial = await crypto.subtle.importKey('raw', ENC.encode(roomId), 'HKDF', false, [
		'deriveBits',
	]);

	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', salt: SALT, info: INFO, hash: 'SHA-256' },
		keyMaterial,
		128
	);

	return btoa(String.fromCharCode(...new Uint8Array(bits)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}
