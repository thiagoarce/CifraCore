<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { mapAuthErrorMessage } from '../shared';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;
		loading = true;

		try {
			const { error } = await data.supabase.auth.signInWithPassword({ email, password });

			if (error) {
				errorMessage = mapAuthErrorMessage(error.message);
				return;
			}

			await invalidate('supabase:auth');
			await goto(resolve('/dashboard'));
		} catch {
			// Network hiccup, redirect loop, etc: surface something instead of
			// leaving the button stuck on "Entrando..." forever.
			errorMessage = 'Ocorreu um erro. Tente novamente.';
		} finally {
			loading = false;
		}
	}
</script>

<h1 class="text-xl font-semibold text-slate-50">Entrar</h1>
<p class="mt-1 text-sm text-slate-400">Acesse sua conta para ver o repertório da sua banda.</p>

<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit}>
	<label class="flex flex-col gap-1">
		<span class="text-sm text-slate-400">E-mail</span>
		<input
			type="email"
			name="email"
			autocomplete="email"
			required
			bind:value={email}
			class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
		/>
	</label>

	<label class="flex flex-col gap-1">
		<span class="text-sm text-slate-400">Senha</span>
		<input
			type="password"
			name="password"
			autocomplete="current-password"
			required
			bind:value={password}
			class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
		/>
	</label>

	{#if errorMessage}
		<p class="text-sm text-red-400" role="alert">{errorMessage}</p>
	{/if}

	<button
		type="submit"
		disabled={loading}
		class="mt-2 rounded-md bg-indigo-500 px-4 py-2 font-medium text-slate-50 disabled:opacity-60"
	>
		{loading ? 'Entrando...' : 'Entrar'}
	</button>
</form>

<div class="mt-6 flex flex-col gap-2 text-sm text-slate-400">
	<a href={resolve('/reset')} class="hover:text-slate-50">Esqueceu a senha?</a>
	<p>
		Não tem conta?
		<a href={resolve('/register')} class="text-indigo-400 hover:text-indigo-300">Cadastre-se</a>
	</p>
</div>
