<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// R2: any member can start the session (not just admins) — whoever
	// starts it becomes the leader.
	let startingSession = $state(false);
	let startError = $state<string | null>(null);

	async function handleStartSession() {
		if (!data.user) return;

		startingSession = true;
		startError = null;

		const firstSongId = data.items[0]?.song_id ?? null;

		const { error } = await data.supabase.from('live_sessions').insert({
			band_id: data.setlist.band_id,
			setlist_id: data.setlist.id,
			leader_id: data.user.id,
			current_song_id: firstSongId
		});

		startingSession = false;

		if (error) {
			// unique violation on band_id: a session is already running for
			// this band (started from this or another setlist).
			startError =
				error.code === '23505'
					? 'Já existe uma sessão ativa para esta banda.'
					: 'Não foi possível iniciar a sessão.';
			return;
		}

		await goto(resolve('/session'), { invalidateAll: true });
	}

	// Seeded once, not reactive to later reloads while the admin is mid-edit
	// (same pattern as songs/[id]/edit/+page.svelte).
	let name = $state(untrack(() => data.setlist.name));
	let eventDate = $state(untrack(() => data.setlist.event_date ?? ''));
	let savingDetails = $state(false);
	let detailsError = $state<string | null>(null);

	async function handleSaveDetails(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;

		savingDetails = true;
		detailsError = null;

		const { error } = await data.supabase
			.from('setlists')
			.update({ name: name.trim(), event_date: eventDate || null })
			.eq('id', data.setlist.id);

		savingDetails = false;

		if (error) {
			detailsError = 'Não foi possível salvar os detalhes do setlist.';
			return;
		}

		await invalidate('app:setlist');
	}

	let itemsError = $state<string | null>(null);

	async function persistOrder(orderedSongIds: string[]) {
		itemsError = null;
		const { error } = await data.supabase.rpc('reorder_setlist', {
			target_setlist_id: data.setlist.id,
			song_ids: orderedSongIds
		});

		if (error) {
			itemsError = 'Não foi possível salvar a nova ordem.';
			return;
		}

		await invalidate('app:setlist');
	}

	function moveItem(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= data.items.length) return;

		const reordered = [...data.items];
		[reordered[index], reordered[target]] = [reordered[target], reordered[index]];
		persistOrder(reordered.map((item) => item.song_id));
	}

	async function removeItem(setlistSongId: string) {
		itemsError = null;
		const { error } = await data.supabase.from('setlist_songs').delete().eq('id', setlistSongId);

		if (error) {
			itemsError = 'Não foi possível remover a música.';
			return;
		}

		await invalidate('app:setlist');
	}

	// --- Adicionar música do catálogo da banda ---------------------------

	interface CatalogSong {
		id: string;
		title: string;
		artist: string | null;
	}

	let catalog = $state<CatalogSong[]>([]);
	let catalogQuery = $state('');
	let addError = $state<string | null>(null);

	$effect(() => {
		data.supabase
			.from('songs')
			.select('id, title, artist')
			.eq('band_id', data.setlist.band_id)
			.order('title')
			.then(({ data: rows }) => {
				catalog = rows ?? [];
			});
	});

	const alreadyAddedIds = $derived(new Set(data.items.map((item) => item.song_id)));

	const availableSongs = $derived(
		catalog
			.filter((song) => !alreadyAddedIds.has(song.id))
			.filter((song) => {
				const q = catalogQuery.trim().toLowerCase();
				if (!q) return true;
				return `${song.title} ${song.artist ?? ''}`.toLowerCase().includes(q);
			})
	);

	async function addSong(songId: string) {
		addError = null;
		const nextPosition = data.items.length;

		const { error } = await data.supabase
			.from('setlist_songs')
			.insert({ setlist_id: data.setlist.id, song_id: songId, position: nextPosition });

		if (error) {
			addError = 'Não foi possível adicionar a música.';
			return;
		}

		await invalidate('app:setlist');
	}
</script>

<div class="mx-auto max-w-2xl p-6">
	<div class="flex items-center justify-between gap-4">
		<a href={resolve('/setlists')} class="text-sm text-content-muted hover:text-content">
			&larr; Setlists
		</a>
		<Button variant="primary" onclick={handleStartSession} disabled={startingSession}>
			{startingSession ? 'Iniciando...' : 'Iniciar Sessão'}
		</Button>
	</div>
	{#if startError}
		<p class="mt-2 text-sm text-danger" role="alert">{startError}</p>
	{/if}

	{#if data.isAdmin}
		<form class="mt-4 flex flex-wrap items-end gap-2" onsubmit={handleSaveDetails}>
			<div class="flex-1">
				<label class="text-xs text-content-muted" for="setlist-name">Nome</label>
				<input
					id="setlist-name"
					type="text"
					required
					bind:value={name}
					class="mt-1 h-11 w-full rounded-md border border-border bg-surface-raised px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
			</div>
			<div>
				<label class="text-xs text-content-muted" for="setlist-date">Data do evento</label>
				<input
					id="setlist-date"
					type="date"
					bind:value={eventDate}
					class="mt-1 h-11 rounded-md border border-border bg-surface-raised px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
			</div>
			<Button variant="secondary" type="submit" disabled={savingDetails}>
				{savingDetails ? 'Salvando...' : 'Salvar'}
			</Button>
		</form>
		{#if detailsError}
			<p class="mt-2 text-sm text-danger" role="alert">{detailsError}</p>
		{/if}
	{:else}
		<h1 class="mt-4 text-xl font-semibold text-content">{data.setlist.name}</h1>
		{#if data.setlist.event_date}
			<p class="mt-1 text-sm text-content-muted">{data.setlist.event_date}</p>
		{/if}
	{/if}

	<section class="mt-8">
		<h2 class="text-sm font-medium text-content-muted uppercase">Músicas</h2>

		{#if itemsError}
			<p class="mt-2 text-sm text-danger" role="alert">{itemsError}</p>
		{/if}

		{#if data.items.length === 0}
			<p class="mt-3 text-sm text-content-muted">Nenhuma música no setlist ainda.</p>
		{:else}
			<ul class="mt-3 flex flex-col gap-2">
				{#each data.items as item, index (item.id)}
					<li
						class="flex items-center justify-between gap-3 rounded-lg bg-surface-raised px-4 py-3"
					>
						<a
							href={resolve(`/songs/${item.song_id}`)}
							class="min-w-0 flex-1 truncate font-medium text-content hover:text-accent"
						>
							{item.songs?.title}
							{#if item.songs?.artist}
								<span class="text-sm text-content-muted"> · {item.songs.artist}</span>
							{/if}
						</a>

						{#if data.isAdmin}
							<div class="flex shrink-0 items-center gap-1">
								<button
									type="button"
									disabled={index === 0}
									onclick={() => moveItem(index, -1)}
									aria-label="Mover para cima"
									class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
								>
									↑
								</button>
								<button
									type="button"
									disabled={index === data.items.length - 1}
									onclick={() => moveItem(index, 1)}
									aria-label="Mover para baixo"
									class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
								>
									↓
								</button>
								<button
									type="button"
									onclick={() => removeItem(item.id)}
									aria-label="Remover do setlist"
									class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-danger"
								>
									✕
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.isAdmin}
		<section class="mt-8 rounded-lg bg-surface-raised p-4">
			<h2 class="text-sm font-medium text-content">Adicionar música</h2>
			<input
				type="search"
				placeholder="Buscar no repertório..."
				bind:value={catalogQuery}
				class="mt-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
			{#if addError}
				<p class="mt-2 text-sm text-danger" role="alert">{addError}</p>
			{/if}
			<ul class="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
				{#each availableSongs as song (song.id)}
					<li>
						<button
							type="button"
							onclick={() => addSong(song.id)}
							class="flex h-11 w-full cursor-pointer items-center justify-between rounded px-3 text-left text-sm text-content hover:bg-surface"
						>
							<span class="truncate"
								>{song.title}{#if song.artist}
									· {song.artist}{/if}</span
							>
							<span class="shrink-0 text-accent">+</span>
						</button>
					</li>
				{:else}
					<li class="px-3 py-2 text-sm text-content-muted">Nenhuma música disponível.</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
