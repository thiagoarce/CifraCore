<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	interface SetlistRow {
		id: string;
		name: string;
		event_date: string | null;
	}

	let setlists = $state<SetlistRow[]>([]);
	let loading = $state(false);
	let loadError = $state<string | null>(null);

	const isAdmin = $derived(
		data.bands.find((band) => band.id === $currentBand?.id)?.role === 'admin'
	);

	// Same reasoning as the dashboard's song list: $currentBand only lives in
	// localStorage, so this can never be a server load.
	$effect(() => {
		const band = $currentBand;
		if (!band) {
			setlists = [];
			return;
		}

		loading = true;
		loadError = null;

		data.supabase
			.from('setlists')
			.select('id, name, event_date')
			.eq('band_id', band.id)
			.order('event_date', { ascending: false, nullsFirst: false })
			.then(({ data: rows, error }) => {
				loading = false;
				if (error) {
					loadError = 'Não foi possível carregar os setlists.';
					return;
				}
				setlists = rows ?? [];
			});
	});

	let creating = $state(false);
	let createError = $state<string | null>(null);
	let newName = $state('');
	let newEventDate = $state('');

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const band = $currentBand;
		if (!band || !newName.trim()) return;

		creating = true;
		createError = null;

		const { data: row, error } = await data.supabase
			.from('setlists')
			.insert({
				band_id: band.id,
				name: newName.trim(),
				event_date: newEventDate || null
			})
			.select('id')
			.single();

		creating = false;

		if (error || !row) {
			createError = 'Não foi possível criar o setlist.';
			return;
		}

		await goto(resolve(`/setlists/${row.id}`), { invalidateAll: true });
	}
</script>

<div class="mx-auto max-w-2xl p-6">
	<h1 class="text-xl font-semibold text-content">Setlists</h1>
	{#if $currentBand}
		<p class="mt-1 text-sm text-content-muted">{$currentBand.name}</p>
	{/if}

	{#if !$currentBand}
		<p class="mt-8 text-sm text-content-muted">
			Você ainda não tem uma banda ativa.
			<a href={resolve('/bands')} class="text-accent hover:opacity-80"
				>Criar ou escolher uma banda</a
			>
		</p>
	{:else}
		<div class="mt-6">
			{#if loading}
				<p class="text-sm text-content-muted">Carregando...</p>
			{:else if loadError}
				<p class="text-sm text-danger" role="alert">{loadError}</p>
			{:else if setlists.length === 0}
				<p class="text-sm text-content-muted">Nenhum setlist ainda.</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each setlists as setlist (setlist.id)}
						<li>
							<a
								href={resolve(`/setlists/${setlist.id}`)}
								class="flex items-center justify-between rounded-lg bg-surface-raised px-4 py-3 hover:bg-surface-raised/70"
							>
								<span class="font-medium text-content">{setlist.name}</span>
								{#if setlist.event_date}
									<span class="text-sm text-content-muted">{setlist.event_date}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if isAdmin}
			<section class="mt-8 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Criar novo setlist</h2>
				<form class="mt-3 flex flex-wrap gap-2" onsubmit={handleCreate}>
					<input
						type="text"
						required
						placeholder="Nome do setlist"
						bind:value={newName}
						class="h-11 flex-1 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<input
						type="date"
						bind:value={newEventDate}
						class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<Button variant="primary" type="submit" disabled={creating}>
						{creating ? 'Criando...' : 'Criar'}
					</Button>
				</form>
				{#if createError}
					<p class="mt-2 text-sm text-danger" role="alert">{createError}</p>
				{/if}
			</section>
		{/if}
	{/if}
</div>
