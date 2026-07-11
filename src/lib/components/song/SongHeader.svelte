<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		title: string;
		artist: string | null;
		originalKey: string | null;
		isAdmin: boolean;
		onEdit?: () => void;
	}

	let { title, artist, originalKey, isAdmin, onEdit }: Props = $props();
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

	<div class="flex items-center gap-3">
		{#if originalKey}
			<div
				class="flex items-center gap-1 rounded-md border border-border px-1"
				title="Transposição chega na fase 004 (inteligência musical)"
			>
				<button
					type="button"
					disabled
					aria-label="Transpor um tom abaixo"
					class="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded text-content-muted opacity-50"
				>
					−
				</button>
				<span class="w-10 text-center text-sm font-medium text-content">{originalKey}</span>
				<button
					type="button"
					disabled
					aria-label="Transpor um tom acima"
					class="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded text-content-muted opacity-50"
				>
					+
				</button>
			</div>
		{/if}
		{#if isAdmin && onEdit}
			<Button variant="secondary" onclick={onEdit}>Editar</Button>
		{/if}
	</div>
</header>
