<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_BRAND_NAME, PUBLIC_ENABLE_TRACKING } from '$env/static/public';
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

	{#if PUBLIC_ENABLE_TRACKING}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id="819b2dba-e547-47a9-b85e-a57f3e5d8d36"
		></script>
	{/if}
</svelte:head>

{@render children()}
