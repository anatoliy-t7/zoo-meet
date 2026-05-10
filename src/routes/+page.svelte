<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateRoomId } from '$lib/utils/id';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Video01Icon,
		KeyboardIcon,
		ShieldKeyIcon,
		AnonymousIcon,
		SourceCodeIcon,
	} from '@hugeicons/core-free-icons';

	const features = [
		{
			icon: ShieldKeyIcon,
			title: 'End-to-end encrypted',
			description:
				'Every session is encrypted in transit. Only people in the room can see or hear anything — not even us.',
		},
		{
			icon: AnonymousIcon,
			title: 'No account required',
			description:
				'Start or join a meeting in seconds. No sign-up, no downloads, no friction. Just share the link.',
		},
		{
			icon: SourceCodeIcon,
			title: 'Fully open source',
			description:
				'The entire codebase is public. Audit it, fork it, self-host it — transparency is the default.',
		},
	] as const;

	let joinCode = $state('');

	function handleStartMeeting() {
		goto(`/${generateRoomId()}`);
	}

	function handleJoinMeeting() {
		if (!joinCode.trim()) return;
		const raw = joinCode.trim();
		// Support full URLs or bare room codes
		try {
			const u = new URL(raw);
			goto(u.pathname);
		} catch {
			const code = raw.includes('/') ? raw.split('/').pop()! : raw;
			goto(`/${code}`);
		}
	}
</script>

<div class="bg-background text-foreground min-h-screen font-sans">
	<div class="border-border border-b">
		<nav class=" mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
			<div class="flex items-center gap-2.5">
				<div class="bg-primary flex size-8 items-center justify-center rounded-full">
					<Icon icon={Video01Icon} size={18} color="black" />
				</div>
				<span class="text-lg font-semibold tracking-tight">Huddle</span>
			</div>

			<a
				href="https://github.com/anatoliy-t7/huddle"
				target="_blank"
				rel="noopener noreferrer"
				class="border-border text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors"
			>
				<svg viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true">
					<path
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
					/>
				</svg>
				GitHub
			</a>
		</nav>
	</div>

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

	<section class="border-border border-t">
		<div class="mx-auto max-w-7xl px-6">
			<div class="divide-border grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
				{#each features as feature (feature.title)}
					<div class="flex flex-col gap-3 py-10 sm:px-10 sm:first:pl-0 sm:last:pr-0">
						<div class="bg-primary/10 flex size-10 items-center justify-center rounded-xl">
							<Icon icon={feature.icon} size={20} color="var(--brand)" />
						</div>
						<h3 class="font-semibold">{feature.title}</h3>
						<p class="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<footer class="border-border border-t">
		<div
			class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row"
		>
			<div class="flex items-center gap-2.5">
				<div class="bg-primary flex size-6 items-center justify-center rounded-full">
					<Icon icon={Video01Icon} size={13} color="black" />
				</div>
				<span class="text-sm font-semibold">Huddle</span>
				<span class="text-muted-foreground text-sm">— free, open-source video calls</span>
			</div>

			<div class="text-muted-foreground flex items-center gap-6 text-sm">
				<a
					href="https://github.com/anatoliy-t7/huddle"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground flex items-center gap-1.5 transition-colors"
				>
					<svg viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true">
						<path
							d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
						/>
					</svg>
					View source
				</a>
				<span>© {new Date().getFullYear()} Huddle</span>
			</div>
		</div>
	</footer>
</div>
