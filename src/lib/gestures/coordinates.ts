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
