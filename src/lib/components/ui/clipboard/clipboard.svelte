<script lang="ts">
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { UseClipboard } from './clipboard.svelte.js';
	import ClipboardIcon from '@lucide/svelte/icons/clipboard';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { ComponentProps } from 'svelte';

	let {
		text,
		variant = 'ghost',
	}: ComponentProps<typeof Button> & {
		text: string;
	} = $props();

	const clipboard = new UseClipboard();
</script>

<Tooltip.Provider>
	<Tooltip.Root disableCloseOnTriggerClick delayDuration={100}>
		<Tooltip.Trigger
			class={buttonVariants({ variant: variant })}
			onclick={() => clipboard.copy(text)}
		>
			{#snippet child({ props })}
				<Button {...props} data-slot="copy-button" size="icon" {variant}>
					<span class="sr-only">Copy</span>

					{#if clipboard.copied}
						<CheckIcon class="size-5" />
					{:else}
						<ClipboardIcon class="size-5" />
					{/if}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>
			{clipboard.copied ? 'Copied' : 'Copy to Clipboard'}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
