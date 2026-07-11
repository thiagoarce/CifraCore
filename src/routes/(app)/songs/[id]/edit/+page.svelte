<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { preferredInstrument } from '$lib/stores/preferredInstrument';
	import DraftEditor from '$lib/components/song/DraftEditor.svelte';
	import type { ASTBlock } from '$lib/types/ast';
	import type { Database, Json } from '$lib/types/database';
	import type { PageData } from './$types';

	type Instrument = Database['public']['Enums']['instrument'];

	let { data }: { data: PageData } = $props();

	// Same tab the song screen would default to (visiting it is what set
	// this preference in the first place) — no query param needed.
	const initialTab = untrack(
		() => data.tabs.find((tab) => tab.instrument === $preferredInstrument) ?? data.tabs[0]
	);

	// Seeds the form once from the loaded data; deliberately not reactive to
	// later reloads of `data` while the admin is mid-edit (untrack silences
	// Svelte's "did you mean $derived?" — no, this is a one-time snapshot).
	let draftTitle = $state(untrack(() => data.song.title));
	let draftArtist = $state(untrack(() => data.song.artist ?? ''));
	let draftOriginalKey = $state(untrack(() => data.song.original_key ?? ''));
	let draftPreferredKey = $state(untrack(() => data.song.preferred_key ?? ''));
	let draftCapo = $state(untrack(() => data.song.capo));
	let draftBpm = $state<number | null>(untrack(() => data.song.bpm));
	let draftInstrument = $state<Instrument>(initialTab?.instrument ?? 'cifra');
	let draftBlocks = $state<ASTBlock[]>(
		initialTab && initialTab.content_type === 'ast' && Array.isArray(initialTab.content)
			? (initialTab.content as unknown as ASTBlock[])
			: []
	);

	let saving = $state(false);
	let saveError = $state<string | null>(null);

	async function handleSave() {
		saveError = null;

		if (!draftTitle.trim()) {
			saveError = 'Título é obrigatório.';
			return;
		}
		if (draftBlocks.length === 0) {
			saveError = 'A tab precisa ter ao menos um bloco.';
			return;
		}

		saving = true;

		const { error } = await data.supabase.rpc('import_song', {
			target_band: data.song.band_id,
			existing_song_id: data.song.id,
			song_title: draftTitle,
			song_artist: draftArtist,
			song_original_key: draftOriginalKey,
			tab_instrument: draftInstrument,
			tab_content: draftBlocks as unknown as Json,
			song_capo: draftCapo,
			song_bpm: draftBpm ?? undefined,
			song_preferred_key: draftPreferredKey
		});

		saving = false;

		if (error) {
			saveError = error.message;
			return;
		}

		// No invalidate() before this goto(): invalidating the destination's
		// own dependency first and then navigating is exactly the race that
		// broke login (see specs/001-fundacao/tasks.md T5). invalidateAll on
		// the goto itself refreshes everything as part of the same navigation.
		await goto(resolve(`/songs/${data.song.id}`), { invalidateAll: true });
	}

	function handleCancel() {
		goto(resolve(`/songs/${data.song.id}`));
	}
</script>

<div class="mx-auto max-w-3xl p-6">
	<a href={resolve(`/songs/${data.song.id}`)} class="text-sm text-content-muted hover:text-content">
		&larr; {data.song.title}
	</a>

	<h1 class="mt-4 text-xl font-semibold text-content">Editar música</h1>

	{#if !data.isAdmin}
		<p class="mt-6 rounded-lg bg-surface-raised p-4 text-sm text-content-muted">
			Apenas administradores da banda podem editar músicas.
		</p>
	{:else if !initialTab}
		<p class="mt-6 rounded-lg bg-surface-raised p-4 text-sm text-content-muted">
			Essa música ainda não tem nenhuma tab para editar.
		</p>
	{:else}
		<div class="mt-6">
			<DraftEditor
				bind:title={draftTitle}
				bind:artist={draftArtist}
				bind:originalKey={draftOriginalKey}
				bind:preferredKey={draftPreferredKey}
				bind:capo={draftCapo}
				bind:bpm={draftBpm}
				bind:instrument={draftInstrument}
				showInstrumentSelector={false}
				showSongExtras={true}
				bind:blocks={draftBlocks}
				{saving}
				{saveError}
				saveLabel="Salvar alterações"
				cancelLabel="Cancelar"
				onSave={handleSave}
				onCancel={handleCancel}
			/>
		</div>
	{/if}
</div>
