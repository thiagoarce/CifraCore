<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		title: string;
		artist: string | null;
		soundingKey: string | null;
		offset: number;
		onTranspose: (direction: 1 | -1) => void;
		capo: number;
		isAdmin: boolean;
		onEdit?: () => void;
		onSaveAsBandKey?: () => void;
		onCapoChange?: (capo: number) => void;
	}

	let {
		title,
		artist,
		soundingKey,
		offset,
		onTranspose,
		capo,
		isAdmin,
		onEdit,
		onSaveAsBandKey,
		onCapoChange
	}: Props = $props();
</script>

<header
	class="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-raised px-6 py-4"
>
	<div class="min-w-0">
		<h1 class="truncate text-lg font-semibold text-content">{title}</h1>
		{#if artist}
			<p class="truncate text-sm text-content-muted">{artist}</p>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-3">
		{#if capo > 0}
			<span class="text-sm text-content-muted">Capo: {capo}ª casa</span>
		{/if}

		{#if isAdmin && onCapoChange}
			<div class="flex items-center gap-1 rounded-md border border-border px-1" title="Capotraste">
				<button
					type="button"
					disabled={capo <= 0}
					onclick={() => onCapoChange(capo - 1)}
					aria-label="Diminuir capotraste"
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
				>
					−
				</button>
				<span class="w-6 text-center text-xs text-content-muted">{capo}</span>
				<button
					type="button"
					disabled={capo >= 12}
					onclick={() => onCapoChange(capo + 1)}
					aria-label="Aumentar capotraste"
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-30"
				>
					+
				</button>
			</div>
		{/if}

		{#if soundingKey}
			<div class="flex items-center gap-1 rounded-md border border-border px-1" title="Transpor">
				<button
					type="button"
					onclick={() => onTranspose(-1)}
					aria-label="Transpor um tom abaixo"
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content"
				>
					−
				</button>
				<span class="w-10 text-center text-sm font-medium text-content">{soundingKey}</span>
				<button
					type="button"
					onclick={() => onTranspose(1)}
					aria-label="Transpor um tom acima"
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded text-content-muted hover:text-content"
				>
					+
				</button>
			</div>
		{/if}

		{#if isAdmin && offset !== 0 && onSaveAsBandKey}
			<button
				type="button"
				onclick={onSaveAsBandKey}
				class="h-11 cursor-pointer text-sm text-accent hover:opacity-80"
			>
				Salvar como tom da banda
			</button>
		{/if}

		{#if isAdmin && onEdit}
			<Button variant="secondary" onclick={onEdit}>Editar</Button>
		{/if}
	</div>
</header>
