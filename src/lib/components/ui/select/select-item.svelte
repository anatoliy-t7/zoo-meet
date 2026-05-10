<script lang="ts">
	import { Select } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { SelectItemProps } from 'bits-ui';

	let { ref = $bindable(null), class: className, label, ...restProps }: Omit<SelectItemProps, 'children'> = $props();
</script>

<Select.Item
	bind:ref
	class={cn(
		'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pr-4 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{label}
	{...restProps}
>
	{#snippet children({ selected })}
		{#if selected}
			<span class="absolute left-2 flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-primary"
				>
					<path d="M20 6 9 17l-5-5" />
				</svg>
			</span>
		{/if}
		{label}
	{/snippet}
</Select.Item>
