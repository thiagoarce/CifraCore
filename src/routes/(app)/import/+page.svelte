<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import { parseChordSheet } from '$lib/utils/chordSheetParser';
	import DraftEditor from '$lib/components/song/DraftEditor.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ASTBlock } from '$lib/types/ast';
	import type { Database, Json } from '$lib/types/database';

	type Instrument = Database['public']['Enums']['instrument'];
	type Mode = 'paste' | 'draft' | 'saved';

	interface ImportTabDraft {
		title: string;
		artist: string;
		original_key: string | null;
		ast: ASTBlock[];
	}

	interface DedupeState {
		existingId: string;
		existingTitle: string;
		draft: ImportTabDraft;
		sourceUrl: string;
	}

	let { data } = $props();

	const currentBandRole = $derived(
		data.bands.find((band: { id: string }) => band.id === $currentBand?.id)?.role
	);
	const canImport = $derived($currentBand !== null && currentBandRole === 'admin');

	let mode = $state<Mode>('paste');
	let pasteText = $state('');
	let processError = $state<string | null>(null);
	let pasteTextareaEl = $state<HTMLTextAreaElement | undefined>(undefined);

	let urlValue = $state('');
	let urlLoading = $state(false);
	let urlError = $state<string | null>(null);
	let dedupe = $state<DedupeState | null>(null);

	let draftTitle = $state('');
	let draftArtist = $state('');
	let draftOriginalKey = $state('');
	let draftInstrument = $state<Instrument>('cifra');
	let draftBlocks = $state<ASTBlock[]>([]);
	let draftSourceUrl = $state<string | null>(null);
	let draftExistingSongId = $state<string | null>(null);

	let saving = $state(false);
	let saveError = $state<string | null>(null);

	function openDraft(
		draft: ImportTabDraft,
		sourceUrl: string | null,
		existingSongId: string | null
	) {
		draftTitle = draft.title ?? '';
		draftArtist = draft.artist ?? '';
		draftOriginalKey = draft.original_key ?? '';
		draftInstrument = 'cifra';
		draftBlocks = draft.ast ?? [];
		draftSourceUrl = sourceUrl;
		draftExistingSongId = existingSongId;
		mode = 'draft';
	}

	function processPaste() {
		processError = null;

		if (!pasteText.trim()) {
			processError = 'Cole o texto da cifra antes de processar.';
			return;
		}

		openDraft(
			{ title: '', artist: '', original_key: null, ast: parseChordSheet(pasteText) },
			null,
			null
		);
	}

	function focusPasteTextarea() {
		pasteTextareaEl?.focus();
	}

	async function handleUrlImport() {
		urlError = null;
		dedupe = null;

		const trimmedUrl = urlValue.trim();
		if (!trimmedUrl) {
			urlError = 'Informe a URL da música.';
			return;
		}
		if (!$currentBand) return;

		urlLoading = true;

		const { data: fnData, error: fnError } = await data.supabase.functions.invoke('import-tab', {
			body: { url: trimmedUrl }
		});

		if (fnError) {
			urlLoading = false;
			// Non-2xx responses land in `error`, not `data` — the structured
			// { success:false, error:{code,message} } body is still readable
			// from the raw Response the SDK attaches as `context`.
			let message = 'Não foi possível importar desta URL.';
			const context = (fnError as { context?: Response }).context;
			if (context) {
				try {
					const body = (await context.json()) as { error?: { message?: string } };
					if (body?.error?.message) message = body.error.message;
				} catch {
					// response wasn't JSON — keep the generic message
				}
			}
			urlError = message;
			return;
		}

		const payload = fnData as
			{ success: true; data: ImportTabDraft } | { success: false; error: { message: string } };

		if (!payload?.success) {
			urlLoading = false;
			urlError = payload?.error?.message ?? 'Não foi possível importar desta URL.';
			return;
		}

		const { data: existing } = await data.supabase
			.from('songs')
			.select('id, title')
			.eq('band_id', $currentBand.id)
			.eq('source_url', trimmedUrl)
			.maybeSingle();

		urlLoading = false;

		if (existing) {
			dedupe = {
				existingId: existing.id,
				existingTitle: existing.title,
				draft: payload.data,
				sourceUrl: trimmedUrl
			};
			return;
		}

		openDraft(payload.data, trimmedUrl, null);
	}

	function confirmOverwrite() {
		if (!dedupe) return;
		openDraft(dedupe.draft, dedupe.sourceUrl, dedupe.existingId);
		dedupe = null;
	}

	function cancelDedupe() {
		dedupe = null;
	}

	function backToPaste() {
		mode = 'paste';
		saveError = null;
		draftSourceUrl = null;
		draftExistingSongId = null;
	}

	async function handleSave() {
		saveError = null;

		if (!$currentBand) {
			saveError = 'Selecione uma banda ativa antes de gravar.';
			return;
		}
		if (!draftTitle.trim()) {
			saveError = 'Título é obrigatório.';
			return;
		}
		if (draftBlocks.length === 0) {
			saveError = 'Adicione ao menos um bloco antes de gravar.';
			return;
		}

		saving = true;

		const { data: newSongId, error } = await data.supabase.rpc('import_song', {
			target_band: $currentBand.id,
			song_title: draftTitle,
			// empty strings are normalized to NULL server-side (import_song RPC)
			song_artist: draftArtist,
			song_original_key: draftOriginalKey,
			tab_instrument: draftInstrument,
			tab_content: draftBlocks as unknown as Json,
			song_source_url: draftSourceUrl ?? undefined,
			existing_song_id: draftExistingSongId ?? undefined
		});

		saving = false;

		if (error || !newSongId) {
			saveError = error?.message ?? 'Não foi possível gravar a música.';
			return;
		}

		mode = 'saved';
		await invalidate('app:bands');
	}

	function importAnother() {
		mode = 'paste';
		pasteText = '';
		urlValue = '';
		urlError = null;
		dedupe = null;
		draftBlocks = [];
		draftSourceUrl = null;
		draftExistingSongId = null;
		saveError = null;
	}
</script>

<main class="min-h-screen bg-surface p-6 text-content">
	<div class="mx-auto max-w-3xl">
		<a href={resolve('/dashboard')} class="text-sm text-content-muted hover:text-content">
			&larr; Dashboard
		</a>

		<h1 class="mt-4 text-xl font-semibold">Importar Música</h1>
		{#if $currentBand}
			<p class="mt-1 text-sm text-content-muted">Banda ativa: {$currentBand.name}</p>
		{/if}

		{#if !$currentBand}
			<p class="mt-6 rounded-lg bg-surface-raised p-4 text-sm text-content-muted">
				Selecione uma banda ativa em
				<a href={resolve('/bands')} class="text-accent hover:opacity-80">Minhas Bandas</a>
				antes de importar.
			</p>
		{:else if !canImport}
			<p class="mt-6 rounded-lg bg-surface-raised p-4 text-sm text-content-muted">
				Apenas administradores da banda podem importar músicas.
			</p>
		{:else if mode === 'paste' && dedupe}
			<section class="mt-6 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Música já importada</h2>
				<p class="mt-1 text-sm text-content-muted">
					Já existe uma música importada desta URL: "{dedupe.existingTitle}". Sobrescrever a tab
					existente ou cancelar?
				</p>
				<div class="mt-3 flex gap-2">
					<Button variant="secondary" onclick={cancelDedupe}>Cancelar</Button>
					<Button variant="primary" onclick={confirmOverwrite}>Sobrescrever</Button>
				</div>
			</section>
		{:else if mode === 'paste'}
			<section class="mt-6 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Importar por URL</h2>
				<p class="mt-1 text-sm text-content-muted">Cole o link de uma música do CifraClub.</p>
				<div class="mt-3 flex gap-2">
					<input
						type="url"
						bind:value={urlValue}
						placeholder="https://www.cifraclub.com.br/artista/musica/"
						class="h-11 flex-1 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<Button variant="primary" onclick={handleUrlImport} loading={urlLoading}>
						Importar por URL
					</Button>
				</div>
				{#if urlError}
					<p class="mt-2 text-sm text-danger" role="alert">{urlError}</p>
					<button
						type="button"
						onclick={focusPasteTextarea}
						class="mt-2 cursor-pointer text-sm text-accent hover:opacity-80"
					>
						Colar cifra manualmente
					</button>
				{/if}
			</section>

			<section class="mt-6 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Modo Avançado — colar cifra</h2>
				<p class="mt-1 text-sm text-content-muted">
					Cole o texto da cifra (com seções como "Refrão", "[Intro]" etc.) e clique em Processar.
				</p>
				<textarea
					bind:this={pasteTextareaEl}
					bind:value={pasteText}
					rows="14"
					placeholder="[Intro] Am  C  G

Refrão
Letra da música aqui..."
					class="mt-3 w-full rounded-md border border-border bg-surface p-3 font-mono text-sm whitespace-pre text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				></textarea>
				{#if processError}
					<p class="mt-2 text-sm text-danger" role="alert">{processError}</p>
				{/if}
				<div class="mt-3">
					<Button variant="primary" onclick={processPaste}>Processar</Button>
				</div>
			</section>
		{:else if mode === 'draft'}
			<div class="mt-6">
				<DraftEditor
					bind:title={draftTitle}
					bind:artist={draftArtist}
					bind:originalKey={draftOriginalKey}
					bind:instrument={draftInstrument}
					bind:blocks={draftBlocks}
					{saving}
					{saveError}
					onSave={handleSave}
					onCancel={backToPaste}
				/>
			</div>
		{:else if mode === 'saved'}
			<section class="mt-6 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Música gravada com sucesso</h2>
				<p class="mt-1 text-sm text-content-muted">
					"{draftTitle}" foi adicionada ao catálogo de {$currentBand.name}.
				</p>
				<div class="mt-4 flex gap-2">
					<Button variant="primary" onclick={importAnother}>Importar outra</Button>
					<a href={resolve('/dashboard')}>
						<Button variant="secondary">Ir para o Dashboard</Button>
					</a>
				</div>
			</section>
		{/if}
	</div>
</main>
