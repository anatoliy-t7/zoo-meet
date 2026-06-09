export type LetterboxLayout = {
	readonly size: number;
	readonly offsetX: number;
	readonly offsetY: number;
	readonly drawWidth: number;
	readonly drawHeight: number;
};

/** Computes letterbox dimensions that fit a video frame inside a square inference canvas. */
export const computeLetterboxLayout = (
	videoWidth: number,
	videoHeight: number,
	size: number,
): LetterboxLayout => {
	const scale = Math.min(size / videoWidth, size / videoHeight);
	const drawWidth = videoWidth * scale;
	const drawHeight = videoHeight * scale;

	return {
		size,
		offsetX: (size - drawWidth) / 2,
		offsetY: (size - drawHeight) / 2,
		drawWidth,
		drawHeight,
	};
};

/**
 * Converts a MediaPipe landmark on a square letterboxed canvas back to video-normalized coords.
 * Returns null when the point falls inside the padding bars.
 */
export const mapLetterboxToVideoNormalized = (
	nx: number,
	ny: number,
	layout: LetterboxLayout,
): { nx: number; ny: number } | null => {
	const px = nx * layout.size;
	const py = ny * layout.size;
	const videoNx = (px - layout.offsetX) / layout.drawWidth;
	const videoNy = (py - layout.offsetY) / layout.drawHeight;

	if (videoNx < 0 || videoNx > 1 || videoNy < 0 || videoNy > 1) {
		return null;
	}

	return { nx: videoNx, ny: videoNy };
};

/** Maps a normalized video-frame point (0–1) to canvas pixel coordinates with object-cover. */
export const mapNormalizedToCanvas = (
	nx: number,
	ny: number,
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	mirrored: boolean,
): { x: number; y: number } => {
	const vw = video.videoWidth;
	const vh = video.videoHeight;
	const cw = canvas.width;
	const ch = canvas.height;

	if (!vw || !vh || !cw || !ch) {
		return { x: 0, y: 0 };
	}

	const videoRatio = vw / vh;
	const canvasRatio = cw / ch;
	let drawWidth: number;
	let drawHeight: number;
	let offsetX = 0;
	let offsetY = 0;

	if (videoRatio > canvasRatio) {
		drawHeight = ch;
		drawWidth = ch * videoRatio;
		offsetX = (cw - drawWidth) / 2;
	} else {
		drawWidth = cw;
		drawHeight = cw / videoRatio;
		offsetY = (ch - drawHeight) / 2;
	}

	const normX = mirrored ? 1 - nx : nx;
	return {
		x: offsetX + normX * drawWidth,
		y: offsetY + ny * drawHeight,
	};
};
