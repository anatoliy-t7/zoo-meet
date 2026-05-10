<script lang="ts">
	import { PUBLIC_BRAND_NAME } from '$env/static/public';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#181818" />
	<meta property="og:site_name" content={PUBLIC_BRAND_NAME} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
