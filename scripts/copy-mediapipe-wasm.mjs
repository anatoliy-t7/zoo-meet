import { cpSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const pkgRoot = resolve('node_modules/@mediapipe/tasks-vision');
const src = resolve(pkgRoot, 'wasm');
const dest = resolve('static/mediapipe/wasm');

if (!existsSync(src)) {
	console.warn('[mediapipe] wasm source not found — run pnpm install first');
	process.exit(0);
}

mkdirSync(resolve('static/mediapipe'), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[mediapipe] wasm copied to static/mediapipe/wasm');

/** MediaPipe bundles reference map files that are not shipped; link to the actual .map files. */
const sourcemapLinks = [
	['vision_bundle_mjs.js.map', 'vision_bundle.mjs.map'],
	['vision_bundle_cjs.js.map', 'vision_bundle.cjs.map'],
];

for (const [linkName, targetName] of sourcemapLinks) {
	const linkPath = resolve(pkgRoot, linkName);
	const targetPath = resolve(pkgRoot, targetName);

	if (!existsSync(targetPath) || existsSync(linkPath)) {
		continue;
	}

	symlinkSync(targetName, linkPath);
	console.log(`[mediapipe] linked ${linkName} -> ${targetName}`);
}
