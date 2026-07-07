<script lang="ts">
	import { currentBand } from '$lib/stores/currentBand';

	let { data, children } = $props();

	// Reconciles the active band whenever the list changes (initial load,
	// band created, band left): prefers the persisted id if still valid,
	// otherwise falls back to the first band.
	$effect(() => {
		currentBand.init(data.bands);
	});
</script>

{@render children()}
