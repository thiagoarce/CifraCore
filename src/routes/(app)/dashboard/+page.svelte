<script lang="ts">
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	interface SongRow {
		id: string;
		title: string;
		artist: string | null;
		original_key: string | null;
	}

	let songs = $state<SongRow[]>([]);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let query = $state('');

	// The active band lives only in localStorage ($currentBand), so this
	// can't be a +page.server.ts load — the server never sees which band is
	// selected (no cookie/URL param encodes it). Same pattern as
	// (app)/import/+page.svelte's dedupe lookup.
	$effect(() => {
		const band = $currentBand;
		if (!band) {
			songs = [];
			return;
		}

		loading = true;
		loadError = null;

		data.supabase
			.from('songs')
			.select('id, title, artist, original_key')
			.eq('band_id', band.id)
			.order('title')
			.then(({ data: rows, error }) => {
				loading = false;
				if (error) {
					loadError = 'Não foi possível carregar o repertório.';
					return;
				}
				songs = rows ?? [];
			});
	});

	const filteredSongs = $derived(
		query.trim() === ''
			? songs
			: songs.filter((song) => {
					const haystack = `${song.title} ${song.artist ?? ''}`.toLowerCase();
					return haystack.includes(query.trim().toLowerCase());
				})
	);
</script>

<div class="mx-auto max-w-3xl p-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold text-content">Repertório</h1>
			{#if $currentBand}
				<p class="mt-1 text-sm text-content-muted">{$currentBand.name}</p>
			{/if}
		</div>
		<a href={resolve('/import')}>
			<Button variant="primary">+ Importar música</Button>
		</a>
	</div>

	{#if !$currentBand}
		<p class="mt-8 text-sm text-content-muted">
			Você ainda não tem uma banda ativa.
			<a href={resolve('/bands')} class="text-accent hover:opacity-80"
				>Criar ou escolher uma banda</a
			>
		</p>
	{:else}
		<div class="mt-6">
			<label class="sr-only" for="song-search">Buscar por título ou artista</label>
			<input
				id="song-search"
				type="search"
				placeholder="Buscar por título ou artista..."
				bind:value={query}
				class="h-11 w-full rounded-md border border-border bg-surface-raised px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</div>

		<div class="mt-4">
			{#if loading}
				<p class="text-sm text-content-muted">Carregando...</p>
			{:else if loadError}
				<p class="text-sm text-danger" role="alert">{loadError}</p>
			{:else if songs.length === 0}
				<p class="text-sm text-content-muted">
					Nenhuma música no repertório ainda.
					<a href={resolve('/import')} class="text-accent hover:opacity-80">Importar a primeira</a>
				</p>
			{:else if filteredSongs.length === 0}
				<p class="text-sm text-content-muted">Nenhuma música encontrada para "{query}".</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each filteredSongs as song (song.id)}
						<li>
							<a
								href={resolve(`/songs/${song.id}`)}
								class="flex items-center justify-between rounded-lg bg-surface-raised px-4 py-3 hover:bg-surface-raised/70"
							>
								<div class="min-w-0">
									<p class="truncate font-medium text-content">{song.title}</p>
									{#if song.artist}
										<p class="truncate text-sm text-content-muted">{song.artist}</p>
									{/if}
								</div>
								{#if song.original_key}
									<span class="ml-3 shrink-0 text-sm text-content-muted">{song.original_key}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
