import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
	},
	vitePlugin: {
		// https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/inspector.md
		inspector: true,
	},
};

export default config;
