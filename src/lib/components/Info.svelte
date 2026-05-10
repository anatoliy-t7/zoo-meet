<script lang="ts">
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Cancel01Icon, Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
	import { onDestroy } from 'svelte';
	import { page } from '$app/stores';

	let { lkState, onClose } = $props<{ lkState: LiveKitState; onClose: () => void }>();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;
	let meetingUrl = $derived(typeof window !== 'undefined' ? window.location.href : $page.url.href);
	let joinedAt = new Date().toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	onDestroy(() => {
		if (copyTimer) clearTimeout(copyTimer);
	});

	async function handleCopy() {
		await navigator.clipboard.writeText(meetingUrl);
		copied = true;
		if (copyTimer) clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="text-foreground flex h-full flex-col">
	<div class="flex h-16 shrink-0 items-center justify-between px-5">
		<h3 class="text-lg font-semibold">Info</h3>
		<Button
			variant="ghost"
			size="icon"
			onclick={onClose}
			class="rounded-full"
			aria-label="Close info"
		>
			<Icon icon={Cancel01Icon} size={18} />
		</Button>
	</div>
	<Separator />

	<ScrollArea class="flex-1 p-5">
		<div class="space-y-4">
			<!-- Meeting details -->
			<div class="bg-card space-y-3 rounded-xl p-4">
				<p class="text-muted-foreground text-xs tracking-widest uppercase">Meeting details</p>
				<div class="space-y-3 text-sm">
					<div class="flex items-center justify-between gap-4">
						<span class="text-muted-foreground shrink-0">Room</span>
						<span class="text-right font-mono break-all">{lkState.room?.name ?? ''}</span>
					</div>
					<div>
						<span class="text-muted-foreground mb-1 block">Invite link</span>
						<button
							onclick={handleCopy}
							class="text-primary group flex w-full items-start gap-2 text-left hover:underline"
						>
							<span class="flex-1 text-xs break-all">{meetingUrl}</span>
							<span class="mt-0.5 shrink-0 transition-transform group-hover:scale-110">
								<Icon icon={copied ? Tick01Icon : Copy01Icon} size={14} color="currentColor" />
							</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Participants -->
			<div class="bg-card space-y-3 rounded-xl p-4">
				<div class="flex items-center gap-2">
					<p class="text-muted-foreground text-xs tracking-widest uppercase">Participants</p>
					<Badge variant="secondary" class="h-4 px-1.5 py-0 text-xs"
						>{lkState.participants.length}</Badge
					>
				</div>
				<div class="space-y-2">
					{#each lkState.participants as p (p.sid || p.identity)}
						<div class="flex items-center gap-3 text-sm">
							<div
								class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
							>
								{p.identity.charAt(0)}
							</div>
							<span>{p.identity}{p.isLocal ? ' (You)' : ''}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Activity -->
			<div class="bg-card space-y-3 rounded-xl p-4">
				<p class="text-muted-foreground text-xs tracking-widest uppercase">Activity</p>
				<div class="flex gap-4 text-sm">
					<span class="text-muted-foreground shrink-0 font-mono">{joinedAt}</span>
					<span>Joined room</span>
				</div>
			</div>
		</div>
	</ScrollArea>
</div>
