<script lang="ts">
	import type { ASTBlock, BlockType } from '$lib/types/ast';
	import type { Database } from '$lib/types/database';
	import Button from '$lib/components/ui/Button.svelte';

	type Instrument = Database['public']['Enums']['instrument'];

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

	interface Props {
		title: string;
		artist: string;
		originalKey: string;
		instrument: Instrument;
		/** Import creates a tab (instrument is a choice); editing operates on
		 * one already-existing tab, so its instrument is fixed, not editable. */
		showInstrumentSelector?: boolean;
		/** Song-level fields the import flow doesn't collect yet (no form for
		 * them there) but editing does: preferred key, capo, bpm. */
		preferredKey?: string;
		capo?: number;
		bpm?: number | null;
		showSongExtras?: boolean;
		blocks: ASTBlock[];
		saving: boolean;
		saveError: string | null;
		saveLabel?: string;
		cancelLabel?: string;
		onSave: () => void;
		onCancel: () => void;
	}

	let {
		title = $bindable(),
		artist = $bindable(),
		originalKey = $bindable(),
		instrument = $bindable(),
		showInstrumentSelector = true,
		preferredKey = $bindable(''),
		capo = $bindable(0),
		bpm = $bindable(null),
		showSongExtras = false,
		blocks = $bindable(),
		saving,
		saveError,
		saveLabel = 'Aprovar e Gravar',
		cancelLabel = 'Voltar',
		onSave,
		onCancel
	}: Props = $props();

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;

		const next = blocks.slice();
		[next[index], next[target]] = [next[target], next[index]];
		blocks = next;
	}

	function removeBlock(index: number) {
		blocks = [...blocks.slice(0, index), ...blocks.slice(index + 1)];
	}
</script>

<section class="rounded-lg bg-surface-raised p-4">
	<h2 class="text-sm font-medium text-content">Rascunho</h2>
	<p class="mt-1 text-sm text-content-muted">
		Revise os dados e os blocos antes de gravar. Nada é salvo até "{saveLabel}".
	</p>

	<div class="mt-4 grid gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">Título *</span>
			<input
				type="text"
				required
				bind:value={title}
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">Artista</span>
			<input
				type="text"
				bind:value={artist}
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">Tom original</span>
			<input
				type="text"
				bind:value={originalKey}
				placeholder="Ex: C, Am, G#m"
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>
		{#if showInstrumentSelector}
			<label class="flex flex-col gap-1">
				<span class="text-sm text-content-muted">Instrumento desta tab</span>
				<select
					bind:value={instrument}
					class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				>
					{#each Object.entries(INSTRUMENT_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if showSongExtras}
			<label class="flex flex-col gap-1">
				<span class="text-sm text-content-muted">Tom preferido da banda</span>
				<input
					type="text"
					bind:value={preferredKey}
					placeholder="Ex: D (se a banda canta transposta)"
					class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-sm text-content-muted">Capotraste</span>
				<input
					type="number"
					min="0"
					max="12"
					bind:value={capo}
					class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-sm text-content-muted">BPM</span>
				<input
					type="number"
					min="1"
					max="399"
					bind:value={bpm}
					placeholder="Opcional"
					class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
			</label>
		{/if}
	</div>

	<h3 class="mt-6 text-sm font-medium text-content">Blocos ({blocks.length})</h3>
	<div class="mt-3 flex flex-col gap-3">
		{#each blocks as block, index (block.id)}
			<div class="rounded-md border border-border bg-surface p-3">
				<div class="flex flex-wrap items-center gap-2">
					<input
						type="text"
						bind:value={block.label}
						aria-label="Rótulo do bloco"
						class="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface-raised px-2 text-sm text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<select
						bind:value={block.type}
						aria-label="Tipo do bloco"
						class="h-10 rounded-md border border-border bg-surface-raised px-2 text-sm text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					>
						{#each Object.entries(BLOCK_TYPE_LABELS) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
					<label class="flex items-center gap-1 text-sm text-content-muted">
						Repetições
						<input
							type="number"
							min="1"
							bind:value={block.repeats}
							class="h-10 w-16 rounded-md border border-border bg-surface-raised px-2 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
						/>
					</label>
					<input
						type="text"
						bind:value={block.role}
						placeholder="Voz (opcional)"
						aria-label="Voz do bloco"
						class="h-10 w-32 rounded-md border border-border bg-surface-raised px-2 text-sm text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
				</div>

				<textarea
					bind:value={block.content}
					rows="4"
					aria-label="Conteúdo do bloco"
					class="mt-2 w-full rounded-md border border-border bg-surface-raised p-2 font-mono text-sm whitespace-pre text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				></textarea>

				<div class="mt-2 flex justify-end gap-2">
					<button
						type="button"
						onclick={() => moveBlock(index, -1)}
						disabled={index === 0}
						class="h-9 cursor-pointer rounded-md border border-border px-2 text-xs text-content disabled:cursor-not-allowed disabled:opacity-30"
					>
						Mover ↑
					</button>
					<button
						type="button"
						onclick={() => moveBlock(index, 1)}
						disabled={index === blocks.length - 1}
						class="h-9 cursor-pointer rounded-md border border-border px-2 text-xs text-content disabled:cursor-not-allowed disabled:opacity-30"
					>
						Mover ↓
					</button>
					<button
						type="button"
						onclick={() => removeBlock(index)}
						class="h-9 cursor-pointer rounded-md border border-border px-2 text-xs text-danger hover:border-danger"
					>
						Remover
					</button>
				</div>
			</div>
		{/each}
	</div>

	{#if saveError}
		<p class="mt-3 text-sm text-danger" role="alert">{saveError}</p>
	{/if}

	<div class="mt-4 flex gap-2">
		<Button variant="secondary" onclick={onCancel}>{cancelLabel}</Button>
		<Button variant="primary" onclick={onSave} loading={saving}>{saveLabel}</Button>
	</div>
</section>
