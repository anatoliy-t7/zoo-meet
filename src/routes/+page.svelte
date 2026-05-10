<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateRoomId } from '$lib/utils/id';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Video01Icon, KeyboardIcon } from '@hugeicons/core-free-icons';

	let joinCode = $state('');

	/** Generates a 16-byte CSPRNG key encoded as base64url (URL-safe, no padding). */
	function generateE2EEKey(): string {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		return btoa(String.fromCharCode(...bytes))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	function handleStartMeeting() {
		const roomId = generateRoomId();
		const key = generateE2EEKey();
		// Key goes in the URL fragment — never sent to any server
		goto(`/${roomId}#key=${key}`);
	}

	function handleJoinMeeting() {
		if (joinCode.trim()) {
			const raw = joinCode.trim();
			// Support full URLs: extract path and preserve the #key= fragment
			try {
				const u = new URL(raw);
				goto(`${u.pathname}${u.hash}`);
			} catch {
				// Plain room code — no E2EE key, user joins unencrypted
				const code = raw.includes('/') ? raw.split('/').pop()! : raw;
				goto(`/${code}`);
			}
		}
	}
</script>

<div class="bg-background text-foreground min-h-screen font-sans">
	<nav class="border-border flex items-center justify-between border-b px-6 py-4">
		<div class="flex items-center gap-2">
			<div class="bg-primary flex size-8 items-center justify-center rounded-full">
				<Icon icon={Video01Icon} size={18} color="black" />
			</div>
			<span class="text-xl font-semibold">Huddle</span>
		</div>
	</nav>

	<main class="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:flex lg:items-center lg:gap-16">
		<div class="lg:w-1/2">
			<h1 class="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
				Secure video calls that keep your conversations private
			</h1>
			<p class="text-muted-foreground mb-10 text-lg">
				Collaborate with your team and catch up with friends. Every meeting is end-to-end encrypted
				— only people in the room can see or hear anything.
			</p>

			<div class="flex flex-col gap-4 sm:flex-row">
				<Button onclick={handleStartMeeting}>
					<Icon icon={Video01Icon} />

					New meeting
				</Button>

				<div class="relative flex flex-1">
					<div
						class="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"
					>
						<Icon icon={KeyboardIcon} />
					</div>
					<Input
						type="text"
						bind:value={joinCode}
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleJoinMeeting()}
						class="focus-visible:border-ring rounded-l-full rounded-r-none border-r-0 pl-12 focus-visible:ring-0"
						placeholder="Enter a code or link"
					/>
					<Button
						onclick={handleJoinMeeting}
						disabled={!joinCode.trim()}
						variant="secondary"
						class="border-border rounded-l-none rounded-r-full border border-l-0"
					>
						Join
					</Button>
				</div>
			</div>

			<div class="border-border mt-8 border-t pt-8">
				<a
					href="https://github.com/anatoliy-t7/huddle"
					target="_blank"
					class="text-muted-foreground hover:text-foreground text-sm hover:underline"
				>
					Huddle is open source
				</a>
			</div>
		</div>

		<div class="hidden lg:block lg:w-1/2">
			<div
				class="bg-popover border-border relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border p-8 shadow-2xl"
			>
				<div
					class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,white,transparent)] opacity-[0.07]"
				></div>
				<div
					class="border-border flex h-full w-full items-center justify-center rounded-3xl border-2 border-dashed"
				>
					<div class="text-muted-foreground flex flex-col items-center gap-4">
						<div class="flex gap-4">
							{#each [0, 1, 2] as _idx (_idx)}
								<div class="bg-card size-24 rounded-full shadow-sm"></div>
							{/each}
						</div>
						<div class="flex gap-4">
							<div class="bg-card size-24 rounded-full shadow-sm"></div>
							<div
								class="bg-secondary border-primary size-24 rounded-full border-2 shadow-sm"
							></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
