const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Generates a cryptographically random room ID in the format `xxxx-xxxxxx-xxxx`. */
export function generateRoomId(): string {
	const segment = (len: number) =>
		Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => CHARS[b % CHARS.length]).join(
			''
		);

	return `${segment(4)}-${segment(6)}-${segment(4)}`;
}
