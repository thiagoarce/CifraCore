<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

	interface BandOption {
		id: string;
		name: string;
	}

	interface Props {
		bands: BandOption[];
		userEmail: string | null;
		open: boolean;
		onClose: () => void;
	}

	let { bands, userEmail, open, onClose }: Props = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Catálogo' },
		{ href: '/bands', label: 'Bandas' },
		{ href: '/import', label: 'Importar música' }
	] as const;

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function selectBand(band: BandOption) {
		currentBand.select(band);
		onClose();
	}
</script>

{#if open}
	<button
		type="button"
		aria-label="Fechar menu"
		onclick={onClose}
		class="fixed inset-0 z-40 bg-black/50 md:hidden"
	></button>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-border bg-surface-raised transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-64 md:translate-x-0 {open
		? 'translate-x-0'
		: ''}"
>
	<div class="flex items-center justify-between border-b border-border p-4">
		<a href={resolve('/dashboard')} class="text-lg font-semibold text-content">CifraCore</a>
		<button
			type="button"
			aria-label="Fechar menu"
			onclick={onClose}
			class="cursor-pointer rounded-md p-2 text-content-muted hover:bg-surface hover:text-content md:hidden"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	{#if bands.length > 0}
		<div class="border-b border-border p-4">
			<p class="text-xs font-medium tracking-wide text-content-muted uppercase">Banda ativa</p>
			<select
				value={$currentBand?.id ?? ''}
				onchange={(event) => {
					const band = bands.find((b) => b.id === event.currentTarget.value);
					if (band) selectBand(band);
				}}
				class="mt-2 h-11 w-full cursor-pointer rounded-md border border-border bg-surface px-3 text-sm text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			>
				{#each bands as band (band.id)}
					<option value={band.id}>{band.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<nav class="flex flex-1 flex-col gap-1 p-4">
		{#each navItems as item (item.href)}
			<a
				href={resolve(item.href)}
				onclick={onClose}
				aria-current={isActive(item.href) ? 'page' : undefined}
				class="flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors {isActive(
					item.href
				)
					? 'bg-accent/10 text-accent'
					: 'text-content-muted hover:bg-surface hover:text-content'}"
			>
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="flex items-center justify-between border-t border-border p-4">
		<div class="min-w-0">
			<p class="truncate text-sm text-content" title={userEmail ?? ''}>{userEmail}</p>
			<form
				method="POST"
				action="/logout"
				use:enhance={() => {
					// localStorage survives the page reload a plain form submit
					// would cause; clear it explicitly so the next login (possibly
					// a different account, same browser) doesn't inherit it.
					currentBand.clear();
				}}
			>
				<button type="submit" class="cursor-pointer text-xs text-content-muted hover:text-danger">
					Sair
				</button>
			</form>
		</div>
		<ThemeToggle />
	</div>
</aside>
