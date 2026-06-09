<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	$effect(() => {
		if (document.documentElement.lang !== page.data.locale) {
			document.documentElement.lang = page.data.locale;
		}
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#181818" />
	<meta property="og:site_name" content={page.data.brandName} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />

	{#if page.data.enableTracking}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id="819b2dba-e547-47a9-b85e-a57f3e5d8d36"
		></script>
	{/if}
</svelte:head>

{@render children()}
