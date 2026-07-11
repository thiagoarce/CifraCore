<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<h1 class="text-xl font-semibold text-content">Criar conta</h1>
<p class="mt-1 text-sm text-content-muted">Cadastre-se para criar ou entrar numa banda.</p>

{#if form?.confirmationPending}
	<p class="mt-6 text-sm text-content">
		Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.
	</p>
	<a href={resolve('/login')} class="mt-4 inline-block text-sm text-accent hover:opacity-80">
		Voltar para o login
	</a>
{:else}
	<form
		method="POST"
		class="mt-6 flex flex-col gap-4"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">E-mail</span>
			<input
				type="email"
				name="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">Senha</span>
			<input
				type="password"
				name="password"
				autocomplete="new-password"
				minlength="6"
				required
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">Confirmar senha</span>
			<input
				type="password"
				name="confirmPassword"
				autocomplete="new-password"
				minlength="6"
				required
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>

		{#if form?.error}
			<p class="text-sm text-danger" role="alert">{form.error}</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="mt-2 h-11 cursor-pointer rounded-md bg-accent px-4 font-medium text-accent-content transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{loading ? 'Criando conta...' : 'Criar conta'}
		</button>
	</form>

	<p class="mt-6 text-sm text-content-muted">
		Já tem conta?
		<a href={resolve('/login')} class="text-accent hover:opacity-80">Entrar</a>
	</p>
{/if}
