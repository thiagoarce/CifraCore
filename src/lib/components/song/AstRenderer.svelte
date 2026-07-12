<script lang="ts">
	import type { RenderedBlock } from '$lib/utils/renderedAst';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		blocks: RenderedBlock[];
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
				<div class="overflow-x-auto font-mono text-sm leading-relaxed text-content">
					{#each block.lines as line, lineIndex (lineIndex)}
						<div class="whitespace-pre">
							{#each line.segments as segment, segmentIndex (segmentIndex)}{#if segment.isChord}<span
										class="font-semibold text-chord">{segment.text}</span
									>{:else}{segment.text}{/if}{/each}{#if line.segments.length === 0 || line.segments.every((s) => s.text === '')}&nbsp;{/if}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}
