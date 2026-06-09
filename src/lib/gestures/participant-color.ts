export type StrokePalette = {
	readonly start: string;
	readonly mid: string;
	readonly end: string;
	readonly glow: string;
};

/** Hash a participant identity into a stable positive integer. */
const hashIdentity = (identity: string): number => {
	let hash = 0;
	for (let i = 0; i < identity.length; i++) {
		hash = (hash * 31 + identity.charCodeAt(i)) >>> 0;
	}
	return hash;
};

const hsla = (h: number, s: number, l: number, a: number): string =>
	`hsla(${h % 360}, ${s}%, ${l}%, ${a})`;

/** Deterministic magic-line colors — every participant gets a unique, stable palette. */
export const getParticipantStrokePalette = (identity: string): StrokePalette => {
	const hue = hashIdentity(identity) % 360;

	return {
		start: hsla(hue, 88, 62, 0.95),
		mid: hsla(hue + 42, 92, 55, 0.9),
		end: hsla(hue + 84, 86, 58, 0.85),
		glow: hsla(hue, 90, 58, 0.78),
	};
};
