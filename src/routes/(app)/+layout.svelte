<script lang="ts">
	import { currentBand } from '$lib/stores/currentBand';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let { data, children } = $props();

	// Reconciles the active band whenever the list changes (initial load,
	// band created, band left): prefers the persisted id if still valid,
	// otherwise falls back to the first band.
	$effect(() => {
		currentBand.init(data.bands);
	});

	let mobileNavOpen = $state(false);
</script>

<div class="min-h-screen bg-surface md:flex">
	<Sidebar
		bands={data.bands}
		userEmail={data.user?.email ?? null}
		open={mobileNavOpen}
		onClose={() => (mobileNavOpen = false)}
	/>

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="flex h-14 items-center gap-3 border-b border-border bg-surface-raised px-4 md:hidden"
		>
			<button
				type="button"
				aria-label="Abrir menu"
				onclick={() => (mobileNavOpen = true)}
				class="cursor-pointer rounded-md p-2 text-content-muted hover:bg-surface hover:text-content"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-5 w-5"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
					/>
				</svg>
			</button>
			<span class="font-semibold text-content">CifraCore</span>
		</header>

		<main class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>
</div>
