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
	let joinedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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

<div class="flex flex-col h-full bg-popover text-foreground">
	<div class="h-16 flex items-center justify-between px-5 shrink-0">
		<h3 class="font-semibold text-lg">Info</h3>
		<Button variant="ghost" size="icon" onclick={onClose} class="rounded-full" aria-label="Close info">
			<Icon icon={Cancel01Icon} size={18} />
		</Button>
	</div>
	<Separator />

	<ScrollArea class="flex-1 p-5">
		<div class="space-y-4">
			<!-- Meeting details -->
			<div class="bg-card rounded-xl p-4 space-y-3">
				<p class="text-xs uppercase tracking-widest text-muted-foreground">Meeting details</p>
				<div class="space-y-3 text-sm">
					<div class="flex justify-between gap-4 items-center">
						<span class="text-muted-foreground shrink-0">Room</span>
						<span class="font-mono text-right break-all">{lkState.room?.name ?? ''}</span>
					</div>
					<div>
						<span class="text-muted-foreground block mb-1">Invite link</span>
						<button
							onclick={handleCopy}
							class="flex items-start gap-2 text-primary hover:underline w-full text-left group"
						>
							<span class="text-xs break-all flex-1">{meetingUrl}</span>
							<span class="shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
								<Icon icon={copied ? Tick01Icon : Copy01Icon} size={14} color="currentColor" />
							</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Participants -->
			<div class="bg-card rounded-xl p-4 space-y-3">
				<div class="flex items-center gap-2">
					<p class="text-xs uppercase tracking-widest text-muted-foreground">Participants</p>
					<Badge variant="secondary" class="text-xs px-1.5 py-0 h-4">{lkState.participants.length}</Badge>
				</div>
				<div class="space-y-2">
					{#each lkState.participants as p (p.sid || p.identity)}
						<div class="flex items-center gap-3 text-sm">
							<div class="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold uppercase text-xs shrink-0">
								{p.identity.charAt(0)}
							</div>
							<span>{p.identity}{p.isLocal ? ' (You)' : ''}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Activity -->
			<div class="bg-card rounded-xl p-4 space-y-3">
				<p class="text-xs uppercase tracking-widest text-muted-foreground">Activity</p>
				<div class="flex gap-4 text-sm">
					<span class="text-muted-foreground font-mono shrink-0">{joinedAt}</span>
					<span>Joined room</span>
				</div>
			</div>
		</div>
	</ScrollArea>
</div>
