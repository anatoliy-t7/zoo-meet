<script lang="ts">
	import { Select } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { SelectTriggerProps } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: SelectTriggerProps = $props();
</script>

<Select.Trigger
	bind:ref
	class={cn(
		'border-input bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-full border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="text-muted-foreground ml-2 shrink-0 opacity-70"
		aria-hidden="true"
	>
		<path d="m6 9 6 6 6-6" />
	</svg>
</Select.Trigger>
