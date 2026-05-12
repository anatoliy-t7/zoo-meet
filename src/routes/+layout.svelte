<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_BRAND_NAME } from '$env/static/public';
	import '../app.css';

	let { children } = $props();

	$effect(() => {
		if (document.documentElement.lang !== page.data.locale) {
			document.documentElement.lang = page.data.locale;
		}
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#181818" />
	<meta property="og:site_name" content={PUBLIC_BRAND_NAME} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
