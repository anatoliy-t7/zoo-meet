<script lang="ts">
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { SentIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import { page } from '$app/state';

	let t = $derived(page.data.t);

	let { lkState, onClose } = $props<{ lkState: LiveKitState; onClose: () => void }>();

	let messageText = $state('');

	function handleSend() {
		if (messageText.trim()) {
			lkState.sendMessage(messageText.trim());
			messageText = '';
		}
	}
</script>

<div class="text-foreground flex h-full flex-col">
	<div class="flex h-16 shrink-0 items-center justify-between px-5">
		<h3 class="text-lg font-semibold">{t('chat.title')}</h3>
		<Button
			variant="ghost"
			size="icon"
			onclick={onClose}
			class="rounded-full"
			aria-label={t('chat.close')}
		>
			<Icon icon={Cancel01Icon} size={18} />
		</Button>
	</div>
	<Separator />

	<ScrollArea class="flex-1 px-4 py-4">
		{#if lkState.messages.length === 0}
			<p class="text-muted-foreground px-4 py-8 text-center text-sm leading-relaxed">
				{t('chat.empty')}
			</p>
		{/if}

		<div class="space-y-4">
			{#each lkState.messages as msg (msg.id)}
				<div class="flex flex-col {msg.isLocal ? 'items-end' : 'items-start'}">
					<div class="mb-1 flex items-baseline gap-2">
						<span
							class="text-sm font-medium {msg.isLocal ? 'text-primary' : 'text-muted-foreground'}"
						>
							{msg.sender}
						</span>
						<span class="text-muted-foreground text-xs">
							{new Date(msg.timestamp).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					</div>
					<div class="bg-secondary max-w-[90%] rounded-2xl px-4 py-2 text-sm break-words">
						{msg.text}
					</div>
				</div>
			{/each}
		</div>
	</ScrollArea>

	<Separator />
	<div class="shrink-0 p-4">
		<div class="relative">
			<Input
				type="text"
				bind:value={messageText}
				onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSend()}
				placeholder={t('chat.placeholder')}
				class="bg-secondary focus-visible:border-ring rounded-full border-transparent pr-12 pl-5"
			/>
			<Button
				variant="ghost"
				size="icon"
				onclick={handleSend}
				disabled={!messageText.trim()}
				class="text-primary hover:text-primary/80 absolute top-1/2 right-1 size-8 -translate-y-1/2 rounded-full"
				aria-label={t('chat.send')}
			>
				<Icon icon={SentIcon} size={16} />
			</Button>
		</div>
	</div>
</div>
