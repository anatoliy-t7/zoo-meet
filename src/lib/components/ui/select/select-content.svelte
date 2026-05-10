<script lang="ts">
	import { Select } from 'bits-ui';
	import { cn } from '$lib/utils';
	import type { SelectContentProps } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 6,
		children,
		...restProps
	}: SelectContentProps = $props();
</script>

<Select.Portal>
	<Select.Content
		bind:ref
		{sideOffset}
		class={cn(
			'bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 min-w-32 overflow-hidden rounded-xl border p-1 shadow-lg',
			className
		)}
		{...restProps}
	>
		<Select.Viewport>
			{@render children?.()}
		</Select.Viewport>
	</Select.Content>
</Select.Portal>
