<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Cancel01Icon, LockPasswordIcon, LockKeyIcon } from '@hugeicons/core-free-icons';
	import type { LiveKitState } from '$lib/livekit/store.svelte';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select';
	import { LANGUAGES } from '$lib/languages';
	import { changeLocale } from '$lib/i18n';

	let t = $derived(page.data.t);

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

	/** Lock meeting — data channel + LiveKit room metadata (token API blocks new joins). */
	let lockMeeting = $derived(lkState.isLocked);
	async function handleLockChange(v: boolean) {
		await lkState.setLocked(v);
	}

	let selectedLanguage = $derived(page.data.locale);

	function handleLanguageChange(locale: string) {
		changeLocale(locale, page.url);
	}
</script>

<div class="text-foreground flex h-full flex-col">
	<div class="flex h-16 shrink-0 items-center justify-between px-5">
		<h3 class="text-lg font-semibold">{t('settings.title')}</h3>
		<Button
			variant="ghost"
			size="icon"
			onclick={onClose}
			class="rounded-full"
			aria-label={t('settings.close')}
		>
			<Icon icon={Cancel01Icon} size={18} />
		</Button>
	</div>
	<Separator />

	<ScrollArea class="flex-1 p-5">
		<div class="space-y-6">
			<!-- Security -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
					{t('settings.security')}
				</p>
				<div class="space-y-4">
					<!-- E2EE status -->
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<Icon
								icon={e2eeEnabled ? LockPasswordIcon : LockKeyIcon}
								size={16}
								color={e2eeEnabled ? 'var(--brand)' : 'var(--meet-text-muted)'}
							/>
							<span class="text-sm font-normal">{t('settings.e2ee')}</span>
						</div>
						{#if e2eeEnabled}
							<span class="text-brand bg-brand/10 rounded-full px-2.5 py-0.5 text-xs font-medium">
								{t('settings.e2ee_active')}
							</span>
						{:else}
							<span
								class="text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium"
							>
								{t('settings.e2ee_off')}
							</span>
						{/if}
					</div>

					<!-- Lock meeting -->
					<div class="flex items-center justify-between">
						<div>
							<Label for="lock-meeting" class="cursor-pointer font-normal"
								>{t('settings.lock_meeting')}</Label
							>
							<p class="text-muted-foreground mt-0.5 text-xs">
								{t('settings.lock_description')}
							</p>
						</div>
						<Switch
							id="lock-meeting"
							checked={lockMeeting}
							onCheckedChange={handleLockChange}
							aria-label={t('settings.lock_meeting')}
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Video -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
					{t('settings.video')}
				</p>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="bg-blur" class="cursor-pointer font-normal">{t('settings.bg_blur')}</Label>
						<Switch
							id="bg-blur"
							checked={backgroundBlur}
							onCheckedChange={handleBlurChange}
							aria-label={t('settings.bg_blur')}
						/>
					</div>
					<div class="flex items-center justify-between">
						<Label for="incoming-video" class="cursor-pointer font-normal"
							>{t('settings.incoming_off')}</Label
						>
						<Switch
							id="incoming-video"
							checked={turnOffIncoming}
							onCheckedChange={handleIncomingVideoChange}
							aria-label={t('settings.incoming_off')}
						/>
					</div>
					<div class="flex items-center justify-between">
						<Label for="hide-self" class="cursor-pointer font-normal"
							>{t('settings.hide_self')}</Label
						>
						<Switch
							id="hide-self"
							checked={hideSelf}
							onCheckedChange={(v) => onHideSelfChange?.(v)}
							aria-label={t('settings.hide_self')}
						/>
					</div>
					<div class="flex items-center justify-between gap-4">
						<Label for="floating-thumb" class="cursor-pointer leading-snug font-normal">
							{t('settings.floating_thumb')}
						</Label>
						<Switch
							id="floating-thumb"
							checked={floatingThumbnail}
							onCheckedChange={(v) => onFloatingThumbnailChange?.(v)}
							aria-label={t('settings.floating_thumb')}
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Audio -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
					{t('settings.audio')}
				</p>
				<div class="flex items-center justify-between">
					<Label for="noise-cancel" class="cursor-pointer font-normal"
						>{t('settings.noise_cancel')}</Label
					>
					<Switch
						id="noise-cancel"
						checked={noiseCancellation}
						onCheckedChange={handleNoiseCancellationChange}
						aria-label={t('settings.noise_cancel')}
					/>
				</div>
			</div>

			<Separator />

			<!-- Language Selector -->
			<div>
				<p class="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
					{t('settings.language')}
				</p>
				<Select.Root
					type="single"
					bind:value={selectedLanguage}
					onValueChange={handleLanguageChange}
				>
					<Select.Trigger class="w-48">
						<Select.Value placeholder={t('settings.select_language_placeholder')}>
							{LANGUAGES.find((l) => l.value === selectedLanguage)?.label ||
								t('settings.select_language_placeholder')}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="w-48">
						{#each LANGUAGES as lang (lang.value)}
							<Select.Item value={lang.value} label={lang.label} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</ScrollArea>
</div>
