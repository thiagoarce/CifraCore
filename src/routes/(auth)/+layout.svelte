<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
	<div class="w-full max-w-sm">
		<p class="mb-6 text-center text-lg font-semibold text-content">CifraCore</p>
		<div class="rounded-lg bg-surface-raised p-6 shadow-lg">
			{@render children()}
		</div>
	</div>
</div>
