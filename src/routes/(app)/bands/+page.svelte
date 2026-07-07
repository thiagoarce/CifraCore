<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';

	let { data } = $props();

	let bandName = $state('');
	let creating = $state(false);
	let createError = $state<string | null>(null);

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		createError = null;
		creating = true;

		const { data: newBandId, error } = await data.supabase.rpc('create_band', {
			band_name: bandName
		});

		if (error) {
			createError = error.message;
			creating = false;
			return;
		}

		bandName = '';
		await invalidate('app:bands');
		creating = false;
		goto(resolve(`/bands/${newBandId}`));
	}

	function selectBand(band: { id: string; name: string }) {
		currentBand.select({ id: band.id, name: band.name });
	}
</script>

<main class="min-h-screen bg-slate-900 p-6 text-slate-50">
	<div class="mx-auto max-w-2xl">
		<a href={resolve('/dashboard')} class="text-sm text-slate-400 hover:text-slate-50">
			&larr; Dashboard
		</a>

		<h1 class="mt-4 text-xl font-semibold">Minhas Bandas</h1>

		<section class="mt-6 flex flex-col gap-3">
			{#if data.bands.length === 0}
				<p class="text-sm text-slate-400">Você ainda não é membro de nenhuma banda.</p>
			{/if}

			{#each data.bands as band (band.id)}
				<div
					class="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
					class:ring-2={$currentBand?.id === band.id}
					class:ring-indigo-500={$currentBand?.id === band.id}
				>
					<div>
						<a href={resolve(`/bands/${band.id}`)} class="font-medium hover:text-indigo-400">
							{band.name}
						</a>
						<p class="text-sm text-slate-400">
							{band.role === 'admin' ? 'Admin' : 'Membro'}
							{#if band.instrument}
								· {band.instrument}
							{/if}
						</p>
					</div>
					<button
						type="button"
						onclick={() => selectBand(band)}
						class="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-50 hover:border-indigo-500"
					>
						{$currentBand?.id === band.id ? 'Ativa' : 'Usar esta'}
					</button>
				</div>
			{/each}
		</section>

		<section class="mt-8 rounded-lg bg-slate-800 p-4">
			<h2 class="text-sm font-medium text-slate-50">Criar nova banda</h2>
			<form class="mt-3 flex gap-2" onsubmit={handleCreate}>
				<input
					type="text"
					name="bandName"
					required
					placeholder="Nome da banda"
					bind:value={bandName}
					class="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
				/>
				<button
					type="submit"
					disabled={creating}
					class="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
				>
					{creating ? 'Criando...' : 'Criar'}
				</button>
			</form>
			{#if createError}
				<p class="mt-2 text-sm text-red-400" role="alert">{createError}</p>
			{/if}
		</section>
	</div>
</main>
