<script lang="ts">
	export interface TabItem {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		tabs: TabItem[];
		active: string;
	}

	let { tabs, active = $bindable() }: Props = $props();
</script>

<div role="tablist" class="flex gap-1 overflow-x-auto border-b border-border">
	{#each tabs as tab (tab.value)}
		<button
			type="button"
			role="tab"
			aria-selected={active === tab.value}
			disabled={tab.disabled}
			onclick={() => (active = tab.value)}
			class="min-h-11 shrink-0 cursor-pointer border-b-2 px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {active ===
			tab.value
				? 'border-accent text-content'
				: 'border-transparent text-content-muted hover:text-content'}"
		>
			{tab.label}
		</button>
	{/each}
</div>
