<script lang="ts">
	interface Props {
		roles: string[];
		active: string | null;
		onSelect: (voice: string | null) => void;
	}

	let { roles, active, onSelect }: Props = $props();
</script>

{#if roles.length > 0}
	<div class="flex flex-wrap items-center gap-2 px-6 pt-4">
		<span class="text-xs font-medium text-content-muted">Voz:</span>
		<button
			type="button"
			onclick={() => onSelect(null)}
			aria-pressed={active === null}
			class="h-11 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors {active ===
			null
				? 'border-accent bg-accent/10 text-accent'
				: 'border-border text-content-muted hover:text-content'}"
		>
			Todas
		</button>
		{#each roles as role (role)}
			<button
				type="button"
				onclick={() => onSelect(role)}
				aria-pressed={active === role}
				class="h-11 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors {active ===
				role
					? 'border-accent bg-accent/10 text-accent'
					: 'border-border text-content-muted hover:text-content'}"
			>
				{role}
			</button>
		{/each}
	</div>
{/if}
