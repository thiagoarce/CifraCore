<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		children: Snippet;
		[key: string]: unknown;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		children,
		...rest
	}: Props = $props();

	const variantClasses: Record<string, string> = {
		primary: 'bg-accent text-accent-content hover:opacity-90',
		secondary: 'bg-surface-raised text-content border border-border hover:border-accent',
		danger: 'bg-danger text-white hover:opacity-90',
		ghost: 'text-content-muted hover:bg-surface-raised hover:text-content'
	};

	const sizeClasses: Record<string, string> = {
		sm: 'h-11 px-3 text-sm',
		md: 'h-11 px-4 text-sm'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 {variantClasses[
		variant
	]} {sizeClasses[size]}"
	{...rest}
>
	{#if loading}
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
			aria-hidden="true"
		></span>
	{/if}
	{@render children()}
</button>
