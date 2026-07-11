<script lang="ts">
	import type { ASTBlock } from '$lib/types/ast';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		blocks: ASTBlock[];
		activeVoice?: string | null;
	}

	let { blocks, activeVoice = null }: Props = $props();
</script>

{#if blocks.length === 0}
	<p class="p-6 text-sm text-content-muted">Nada pra mostrar aqui ainda.</p>
{:else}
	<div class="flex flex-col gap-6 p-6">
		{#each blocks as block (block.id)}
			<section class={activeVoice && block.role && block.role !== activeVoice ? 'opacity-50' : ''}>
				<div
					class="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-content-muted uppercase"
				>
					<span>{block.label}</span>
					{#if block.repeats > 1}
						<Badge variant="accent">{block.repeats}x</Badge>
					{/if}
					{#if block.role}
						<Badge>{block.role}</Badge>
					{/if}
				</div>
				<pre
					class="overflow-x-auto font-mono text-sm leading-relaxed text-content">{block.content}</pre>
			</section>
		{/each}
	</div>
{/if}
