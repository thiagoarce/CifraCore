<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'accent' | 'danger';
		children: Snippet;
	}

	let { variant = 'default', children }: Props = $props();

	const variantClasses: Record<string, string> = {
		default: 'bg-surface text-content-muted border border-border',
		accent: 'bg-accent/10 text-accent border border-accent/30',
		danger: 'bg-danger/10 text-danger border border-danger/30'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {variantClasses[
		variant
	]}"
>
	{@render children()}
</span>
