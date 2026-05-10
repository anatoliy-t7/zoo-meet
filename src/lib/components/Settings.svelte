<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Cancel01Icon, LockPasswordIcon, LockKeyIcon } from '@hugeicons/core-free-icons';
	import type { LiveKitState } from '$lib/livekit/store.svelte';

	let {
		onClose,
		lkState,
		e2eeEnabled = false,
		hideSelf = false,
		floatingThumbnail = true,
		onHideSelfChange,
		onFloatingThumbnailChange,
	} = $props<{
		onClose: () => void;
		lkState: LiveKitState;
		e2eeEnabled?: boolean;
		hideSelf?: boolean;
		floatingThumbnail?: boolean;
		onHideSelfChange?: (v: boolean) => void;
		onFloatingThumbnailChange?: (v: boolean) => void;
	}>();

	/** Blur toggle — also synced with ControlBar's backgroundBlur via store */
	let backgroundBlur = $derived(lkState.isBlurEnabled);

	async function handleBlurChange(v: boolean) {
		await lkState.toggleBackgroundBlur(v);
	}

	let turnOffIncoming = $state(false);
	function handleIncomingVideoChange(v: boolean) {
		turnOffIncoming = v;
		lkState.setIncomingVideoEnabled(!v);
	}

	let noiseCancellation = $state(true);
	async function handleNoiseCancellationChange(v: boolean) {
		noiseCancellation = v;
		await lkState.setNoiseCancellationEnabled(v);
	}

	/** Lock meeting — broadcast to all participants, server enforcement is TODO */
	let lockMeeting = $derived(lkState.isLocked);
	function handleLockChange(v: boolean) {
		lkState.setLocked(v);
	}
</script>

<div class="text-foreground flex h-full flex-col">
	<div class="flex h-16 shrink-0 items-center justify-between px-5">
		<h3 class="text-lg font-semibold">Settings</h3>
		<Button
			variant="ghost"
			size="icon"
			onclick={onClose}
			class="rounded-full"
			aria-label="Close settings"
		>
			<Icon icon={Cancel01Icon} size={18} />
		</Button>
	</div>
	<Separator />

	<ScrollArea class="flex-1 p-5">
		<div class="space-y-6">
			<!-- Security -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">Security</p>
				<div class="space-y-4">
					<!-- E2EE status -->
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<Icon
								icon={e2eeEnabled ? LockPasswordIcon : LockKeyIcon}
								size={16}
								color={e2eeEnabled ? 'var(--brand)' : 'var(--meet-text-muted)'}
							/>
							<span class="text-sm font-normal">End-to-end encryption</span>
						</div>
						{#if e2eeEnabled}
							<span class="text-brand bg-brand/10 rounded-full px-2.5 py-0.5 text-xs font-medium">
								Active
							</span>
						{:else}
							<span
								class="text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium"
							>
								Off
							</span>
						{/if}
					</div>

					<!-- Lock meeting -->
					<div class="flex items-center justify-between">
						<div>
							<Label for="lock-meeting" class="cursor-pointer font-normal">Lock meeting</Label>
							<p class="text-muted-foreground mt-0.5 text-xs">
								Prevent new participants from joining
							</p>
						</div>
						<Switch
							id="lock-meeting"
							checked={lockMeeting}
							onCheckedChange={handleLockChange}
							aria-label="Lock meeting"
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Video -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">Video</p>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="bg-blur" class="cursor-pointer font-normal">Background blur</Label>
						<Switch
							id="bg-blur"
							checked={backgroundBlur}
							onCheckedChange={handleBlurChange}
							aria-label="Toggle background blur"
						/>
					</div>
					<div class="flex items-center justify-between">
						<Label for="incoming-video" class="cursor-pointer font-normal"
							>Turn off incoming video</Label
						>
						<Switch
							id="incoming-video"
							checked={turnOffIncoming}
							onCheckedChange={handleIncomingVideoChange}
							aria-label="Turn off incoming video"
						/>
					</div>
					<div class="flex items-center justify-between">
						<Label for="hide-self" class="cursor-pointer font-normal">Hide self view</Label>
						<Switch
							id="hide-self"
							checked={hideSelf}
							onCheckedChange={(v) => onHideSelfChange?.(v)}
							aria-label="Hide self view"
						/>
					</div>
					<div class="flex items-center justify-between gap-4">
						<Label for="floating-thumb" class="cursor-pointer leading-snug font-normal">
							Floating thumbnail during screenshare
						</Label>
						<Switch
							id="floating-thumb"
							checked={floatingThumbnail}
							onCheckedChange={(v) => onFloatingThumbnailChange?.(v)}
							aria-label="Floating thumbnail during screenshare"
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Audio -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">Audio</p>
				<div class="flex items-center justify-between">
					<Label for="noise-cancel" class="cursor-pointer font-normal">Noise cancellation</Label>
					<Switch
						id="noise-cancel"
						checked={noiseCancellation}
						onCheckedChange={handleNoiseCancellationChange}
						aria-label="Toggle noise cancellation"
					/>
				</div>
			</div>
		</div>
	</ScrollArea>
</div>
