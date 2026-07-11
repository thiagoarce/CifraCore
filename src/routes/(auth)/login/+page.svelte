<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<h1 class="text-xl font-semibold text-content">Entrar</h1>
<p class="mt-1 text-sm text-content-muted">Acesse sua conta para ver o repertório da sua banda.</p>

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
			autocomplete="current-password"
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
		{loading ? 'Entrando...' : 'Entrar'}
	</button>
</form>

<div class="mt-6 flex flex-col gap-2 text-sm text-content-muted">
	<a href={resolve('/reset')} class="hover:text-content">Esqueceu a senha?</a>
	<p>
		Não tem conta?
		<a href={resolve('/register')} class="text-accent hover:opacity-80">Cadastre-se</a>
	</p>
</div>
