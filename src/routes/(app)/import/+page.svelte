<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import { parseChordSheet } from '$lib/utils/chordSheetParser';
	import type { ASTBlock, BlockType } from '$lib/types/ast';
	import type { Database, Json } from '$lib/types/database';

	type Instrument = Database['public']['Enums']['instrument'];
	type Mode = 'paste' | 'draft' | 'saved';

	const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
		intro: 'Intro',
		verse: 'Verso',
		chorus: 'Refrão',
		bridge: 'Ponte',
		solo: 'Solo',
		outro: 'Final'
	};

	const INSTRUMENT_LABELS: Record<Instrument, string> = {
		cifra: 'Cifra (letra + acordes)',
		vocal: 'Vocal',
		guitar: 'Violão / Guitarra',
		bass: 'Baixo',
		drums: 'Bateria',
		keys: 'Teclado'
	};

	let { data } = $props();

	const currentBandRole = $derived(
		data.bands.find((band: { id: string }) => band.id === $currentBand?.id)?.role
	);
	const canImport = $derived($currentBand !== null && currentBandRole === 'admin');

	let mode = $state<Mode>('paste');
	let pasteText = $state('');
	let processError = $state<string | null>(null);

	let draftTitle = $state('');
	let draftArtist = $state('');
	let draftOriginalKey = $state('');
	let draftInstrument = $state<Instrument>('cifra');
	let draftBlocks = $state<ASTBlock[]>([]);

	let saving = $state(false);
	let saveError = $state<string | null>(null);

	function processPaste() {
		processError = null;

		if (!pasteText.trim()) {
			processError = 'Cole o texto da cifra antes de processar.';
			return;
		}

		draftBlocks = parseChordSheet(pasteText);
		draftTitle = '';
		draftArtist = '';
		draftOriginalKey = '';
		draftInstrument = 'cifra';
		mode = 'draft';
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= draftBlocks.length) return;

		const next = draftBlocks.slice();
		[next[index], next[target]] = [next[target], next[index]];
		draftBlocks = next;
	}

	function removeBlock(index: number) {
		draftBlocks = [...draftBlocks.slice(0, index), ...draftBlocks.slice(index + 1)];
	}

	function backToPaste() {
		mode = 'paste';
		saveError = null;
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
			tab_content: draftBlocks as unknown as Json
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
		draftBlocks = [];
		saveError = null;
	}
</script>

<main class="min-h-screen bg-slate-900 p-6 text-slate-50">
	<div class="mx-auto max-w-3xl">
		<a href={resolve('/dashboard')} class="text-sm text-slate-400 hover:text-slate-50">
			&larr; Dashboard
		</a>

		<h1 class="mt-4 text-xl font-semibold">Importar Música</h1>
		{#if $currentBand}
			<p class="mt-1 text-sm text-slate-400">Banda ativa: {$currentBand.name}</p>
		{/if}

		{#if !$currentBand}
			<p class="mt-6 rounded-lg bg-slate-800 p-4 text-sm text-slate-400">
				Selecione uma banda ativa em
				<a href={resolve('/bands')} class="text-indigo-400 hover:text-indigo-300">Minhas Bandas</a>
				antes de importar.
			</p>
		{:else if !canImport}
			<p class="mt-6 rounded-lg bg-slate-800 p-4 text-sm text-slate-400">
				Apenas administradores da banda podem importar músicas.
			</p>
		{:else if mode === 'paste'}
			<section class="mt-6 rounded-lg bg-slate-800 p-4">
				<h2 class="text-sm font-medium text-slate-50">Modo Avançado — colar cifra</h2>
				<p class="mt-1 text-sm text-slate-400">
					Cole o texto da cifra (com seções como "Refrão", "[Intro]" etc.) e clique em Processar.
				</p>
				<textarea
					bind:value={pasteText}
					rows="14"
					placeholder="[Intro] Am  C  G

Refrão
Letra da música aqui..."
					class="mt-3 w-full rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm whitespace-pre text-slate-50 outline-none focus:border-indigo-500"
				></textarea>
				{#if processError}
					<p class="mt-2 text-sm text-red-400" role="alert">{processError}</p>
				{/if}
				<button
					type="button"
					onclick={processPaste}
					class="mt-3 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50"
				>
					Processar
				</button>
			</section>
		{:else if mode === 'draft'}
			<section class="mt-6 rounded-lg bg-slate-800 p-4">
				<h2 class="text-sm font-medium text-slate-50">Rascunho</h2>
				<p class="mt-1 text-sm text-slate-400">
					Revise os dados e os blocos antes de gravar. Nada é salvo até "Aprovar e Gravar".
				</p>

				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1">
						<span class="text-sm text-slate-400">Título *</span>
						<input
							type="text"
							required
							bind:value={draftTitle}
							class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-sm text-slate-400">Artista</span>
						<input
							type="text"
							bind:value={draftArtist}
							class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-sm text-slate-400">Tom original</span>
						<input
							type="text"
							bind:value={draftOriginalKey}
							placeholder="Ex: C, Am, G#m"
							class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-sm text-slate-400">Instrumento desta tab</span>
						<select
							bind:value={draftInstrument}
							class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
						>
							{#each Object.entries(INSTRUMENT_LABELS) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</label>
				</div>

				<h3 class="mt-6 text-sm font-medium text-slate-50">Blocos ({draftBlocks.length})</h3>
				<div class="mt-3 flex flex-col gap-3">
					{#each draftBlocks as block, index (block.id)}
						<div class="rounded-md border border-slate-700 bg-slate-900 p-3">
							<div class="flex flex-wrap items-center gap-2">
								<input
									type="text"
									bind:value={block.label}
									aria-label="Rótulo do bloco"
									class="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-50 outline-none focus:border-indigo-500"
								/>
								<select
									bind:value={block.type}
									aria-label="Tipo do bloco"
									class="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-50 outline-none focus:border-indigo-500"
								>
									{#each Object.entries(BLOCK_TYPE_LABELS) as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
								<label class="flex items-center gap-1 text-sm text-slate-400">
									Repetições
									<input
										type="number"
										min="1"
										bind:value={block.repeats}
										class="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-50 outline-none focus:border-indigo-500"
									/>
								</label>
								<input
									type="text"
									bind:value={block.role}
									placeholder="Voz (opcional)"
									aria-label="Voz do bloco"
									class="w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-50 outline-none focus:border-indigo-500"
								/>
							</div>

							<textarea
								bind:value={block.content}
								rows="4"
								aria-label="Conteúdo do bloco"
								class="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 p-2 font-mono text-sm whitespace-pre text-slate-50 outline-none focus:border-indigo-500"
							></textarea>

							<div class="mt-2 flex justify-end gap-2">
								<button
									type="button"
									onclick={() => moveBlock(index, -1)}
									disabled={index === 0}
									class="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-50 disabled:opacity-30"
								>
									Mover ↑
								</button>
								<button
									type="button"
									onclick={() => moveBlock(index, 1)}
									disabled={index === draftBlocks.length - 1}
									class="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-50 disabled:opacity-30"
								>
									Mover ↓
								</button>
								<button
									type="button"
									onclick={() => removeBlock(index)}
									class="rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-400"
								>
									Remover
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if saveError}
					<p class="mt-3 text-sm text-red-400" role="alert">{saveError}</p>
				{/if}

				<div class="mt-4 flex gap-2">
					<button
						type="button"
						onclick={backToPaste}
						class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-50"
					>
						Voltar
					</button>
					<button
						type="button"
						onclick={handleSave}
						disabled={saving}
						class="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
					>
						{saving ? 'Gravando...' : 'Aprovar e Gravar'}
					</button>
				</div>
			</section>
		{:else if mode === 'saved'}
			<section class="mt-6 rounded-lg bg-slate-800 p-4">
				<h2 class="text-sm font-medium text-slate-50">Música gravada com sucesso</h2>
				<p class="mt-1 text-sm text-slate-400">
					"{draftTitle}" foi adicionada ao catálogo de {$currentBand.name}.
				</p>
				<div class="mt-4 flex gap-2">
					<button
						type="button"
						onclick={importAnother}
						class="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50"
					>
						Importar outra
					</button>
					<a
						href={resolve('/dashboard')}
						class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-50"
					>
						Ir para o Dashboard
					</a>
				</div>
			</section>
		{/if}
	</div>
</main>
