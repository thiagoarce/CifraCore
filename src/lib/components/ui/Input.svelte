<script lang="ts">
	interface Props {
		label: string;
		id: string;
		type?: string;
		value: string;
		error?: string | null;
		helperText?: string;
		required?: boolean;
		[key: string]: unknown;
	}

	let {
		label,
		id,
		type = 'text',
		value = $bindable(),
		error = null,
		helperText = '',
		required = false,
		...rest
	}: Props = $props();
</script>

<div class="flex flex-col gap-1">
	<label for={id} class="text-sm font-medium text-content">
		{label}{#if required}<span class="text-danger"> *</span>{/if}
	</label>
	<input
		{id}
		{type}
		bind:value
		{required}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
		class="h-11 rounded-md border bg-surface px-3 text-content outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent {error
			? 'border-danger'
			: 'border-border focus-visible:border-accent'}"
		{...rest}
	/>
	{#if error}
		<p id="{id}-error" class="text-sm text-danger" role="alert">{error}</p>
	{:else if helperText}
		<p id="{id}-helper" class="text-sm text-content-muted">{helperText}</p>
	{/if}
</div>
