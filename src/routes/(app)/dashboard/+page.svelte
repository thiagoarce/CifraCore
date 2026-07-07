<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';

	let { data } = $props();

	let loggingOut = $state(false);

	async function handleLogout() {
		loggingOut = true;
		await data.supabase.auth.signOut();
		currentBand.clear();
		await invalidate('supabase:auth');
		goto(resolve('/login'));
	}

	function selectBand(band: { id: string; name: string }) {
		currentBand.select({ id: band.id, name: band.name });
	}
</script>

<main class="min-h-screen bg-slate-900 p-6 text-slate-50">
	<div class="mx-auto max-w-2xl">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-xl font-semibold">Olá, {data.user?.email}</h1>
				{#if $currentBand}
					<p class="mt-1 text-sm text-slate-400">Banda ativa: {$currentBand.name}</p>
				{/if}
			</div>
			<button
				type="button"
				onclick={handleLogout}
				disabled={loggingOut}
				class="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-50 hover:border-red-400 disabled:opacity-60"
			>
				{loggingOut ? 'Saindo...' : 'Sair'}
			</button>
		</div>

		<section class="mt-8 rounded-lg bg-slate-800 p-4">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-medium text-slate-50">Minhas bandas</h2>
				<a href={resolve('/bands')} class="text-sm text-indigo-400 hover:text-indigo-300"
					>Gerenciar</a
				>
			</div>

			{#if data.bands.length === 0}
				<p class="mt-3 text-sm text-slate-400">
					Você ainda não é membro de nenhuma banda.
					<a href={resolve('/bands')} class="text-indigo-400 hover:text-indigo-300"
						>Criar uma banda</a
					>
				</p>
			{:else}
				<ul class="mt-3 flex flex-col gap-2">
					{#each data.bands as band (band.id)}
						<li>
							<button
								type="button"
								onclick={() => selectBand(band)}
								class="flex w-full items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-left text-sm"
								class:ring-2={$currentBand?.id === band.id}
								class:ring-indigo-500={$currentBand?.id === band.id}
							>
								<span>{band.name}</span>
								<span class="text-slate-400">{band.role === 'admin' ? 'Admin' : 'Membro'}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</main>
