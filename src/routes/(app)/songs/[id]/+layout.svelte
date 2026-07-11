<script lang="ts">
	// Exists only so songs/[id]/+page.svelte and songs/[id]/edit/+page.svelte
	// share the load in +layout.ts (song, tabs, isAdmin) without duplicating
	// the query.
	let { children } = $props();
</script>

{@render children()}
