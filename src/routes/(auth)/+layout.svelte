<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
	<div class="w-full max-w-sm">
		<p class="mb-6 text-center text-lg font-semibold text-slate-50">CifraCore</p>
		<div class="rounded-lg bg-slate-800 p-6 shadow-lg">
			{@render children()}
		</div>
	</div>
</div>
