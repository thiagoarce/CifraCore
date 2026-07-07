<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { mapAuthErrorMessage } from '../shared';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let confirmationPending = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;

		if (password !== confirmPassword) {
			errorMessage = 'As senhas não coincidem.';
			return;
		}

		loading = true;

		const { data: signUpData, error } = await data.supabase.auth.signUp({ email, password });

		if (error) {
			errorMessage = mapAuthErrorMessage(error.message);
			loading = false;
			return;
		}

		if (signUpData.session) {
			// E-mail confirmation disabled: Supabase already returns a session.
			await invalidate('supabase:auth');
			goto(resolve('/dashboard'));
			return;
		}

		// E-mail confirmation required before the user can sign in.
		confirmationPending = true;
		loading = false;
	}
</script>

<h1 class="text-xl font-semibold text-slate-50">Criar conta</h1>
<p class="mt-1 text-sm text-slate-400">Cadastre-se para criar ou entrar numa banda.</p>

{#if confirmationPending}
	<p class="mt-6 text-sm text-slate-50">
		Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.
	</p>
	<a
		href={resolve('/login')}
		class="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
	>
		Voltar para o login
	</a>
{:else}
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
				autocomplete="new-password"
				minlength="6"
				required
				bind:value={password}
				class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm text-slate-400">Confirmar senha</span>
			<input
				type="password"
				name="confirmPassword"
				autocomplete="new-password"
				minlength="6"
				required
				bind:value={confirmPassword}
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
			{loading ? 'Criando conta...' : 'Criar conta'}
		</button>
	</form>

	<p class="mt-6 text-sm text-slate-400">
		Já tem conta?
		<a href={resolve('/login')} class="text-indigo-400 hover:text-indigo-300">Entrar</a>
	</p>
{/if}
