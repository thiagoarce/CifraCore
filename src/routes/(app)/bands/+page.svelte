<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { currentBand } from '$lib/stores/currentBand';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);

	function selectBand(band: { id: string; name: string }) {
		currentBand.select({ id: band.id, name: band.name });
	}
</script>

<main class="min-h-screen bg-surface p-6 text-content">
	<div class="mx-auto max-w-2xl">
		<a href={resolve('/dashboard')} class="text-sm text-content-muted hover:text-content">
			&larr; Dashboard
		</a>

		<h1 class="mt-4 text-xl font-semibold">Minhas Bandas</h1>

		<section class="mt-6 flex flex-col gap-3">
			{#if data.bands.length === 0}
				<p class="text-sm text-content-muted">Você ainda não é membro de nenhuma banda.</p>
			{/if}

			{#each data.bands as band (band.id)}
				<div
					class="flex items-center justify-between rounded-lg bg-surface-raised px-4 py-3"
					class:ring-2={$currentBand?.id === band.id}
					class:ring-accent={$currentBand?.id === band.id}
				>
					<div>
						<a href={resolve(`/bands/${band.id}`)} class="font-medium hover:text-accent">
							{band.name}
						</a>
						<p class="text-sm text-content-muted">
							{band.role === 'admin' ? 'Admin' : 'Membro'}
							{#if band.instrument}
								· {band.instrument}
							{/if}
						</p>
					</div>
					<button
						type="button"
						onclick={() => selectBand(band)}
						class="h-11 cursor-pointer rounded-md border border-border px-3 text-sm text-content hover:border-accent"
					>
						{$currentBand?.id === band.id ? 'Ativa' : 'Usar esta'}
					</button>
				</div>
			{/each}
		</section>

		<section class="mt-8 rounded-lg bg-surface-raised p-4">
			<h2 class="text-sm font-medium text-content">Criar nova banda</h2>
			<form
				method="POST"
				class="mt-3 flex gap-2"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				<input
					type="text"
					name="bandName"
					required
					placeholder="Nome da banda"
					class="h-11 flex-1 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
				/>
				<button
					type="submit"
					disabled={creating}
					class="h-11 cursor-pointer rounded-md bg-accent px-4 text-sm font-medium text-accent-content transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{creating ? 'Criando...' : 'Criar'}
				</button>
			</form>
			{#if form?.error}
				<p class="mt-2 text-sm text-danger" role="alert">{form.error}</p>
			{/if}
		</section>
	</div>
</main>
