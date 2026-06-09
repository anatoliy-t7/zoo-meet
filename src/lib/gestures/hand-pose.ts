/** Normalized hand landmark from MediaPipe. */
export type HandLandmark = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
};

const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;

/** Returns true when the fingertip is farther from the wrist than its PIP joint. */
const isFingerExtended = (
	landmarks: readonly HandLandmark[],
	tipIdx: number,
	pipIdx: number,
	threshold: number,
): boolean => {
	const wrist = landmarks[0];
	const tip = landmarks[tipIdx];
	const pip = landmarks[pipIdx];
	const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
	const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
	return tipDist > pipDist * threshold;
};

/** True when the index finger is clearly extended/open. */
export const isIndexExtended = (landmarks: readonly HandLandmark[]): boolean => {
	if (landmarks.length < 21) {
		return false;
	}

	const tipBeyondPip = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, 1.0);
	const tipBeyondMcp = isFingerExtended(landmarks, INDEX_TIP, INDEX_MCP, 0.85);

	return tipBeyondPip && tipBeyondMcp;
};

/** Looser check — tolerates brief landmark noise while the finger stays open. */
export const isIndexExtendedLenient = (landmarks: readonly HandLandmark[]): boolean => {
	if (landmarks.length < 21) {
		return false;
	}

	const tipBeyondPip = isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, 0.93);
	const tipBeyondMcp = isFingerExtended(landmarks, INDEX_TIP, INDEX_MCP, 0.8);

	return tipBeyondPip && tipBeyondMcp;
};

/** True when the index finger is clearly folded/closed. */
export const isIndexClosed = (landmarks: readonly HandLandmark[]): boolean => {
	if (landmarks.length < 21) {
		return false;
	}

	return !isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, 0.97);
};

/**
 * Whether to keep drawing.
 * Stops immediately when the finger is closed; only coasts when the hand vanishes from the frame.
 */
export const shouldTrackIndexFinger = (
	landmarks: readonly HandLandmark[] | undefined,
	wasTracking: boolean,
	msSinceLastOpen: number,
	detectionCoastMs: number,
): boolean => {
	if (landmarks) {
		if (isIndexClosed(landmarks)) {
			return false;
		}

		if (isIndexExtended(landmarks) || isIndexExtendedLenient(landmarks)) {
			return true;
		}

		// Hysteresis — tolerate brief landmark noise while the finger stays uncurlled.
		if (wasTracking) {
			return true;
		}

		return false;
	}

	return wasTracking && msSinceLastOpen < detectionCoastMs;
};

/** Index fingertip position in normalized [0, 1] coordinates. */
export const getIndexFingertip = (landmarks: readonly HandLandmark[]): { x: number; y: number } => ({
	x: landmarks[INDEX_TIP].x,
	y: landmarks[INDEX_TIP].y,
});
