<script lang="ts">
	import { resolve } from '$app/paths';
	import { mapAuthErrorMessage } from '../shared';

	let { data } = $props();

	let email = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let sent = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;
		loading = true;

		const { error } = await data.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset`
		});

		loading = false;

		if (error) {
			errorMessage = mapAuthErrorMessage(error.message);
			return;
		}

		sent = true;
	}
</script>

<h1 class="text-xl font-semibold text-slate-50">Recuperar senha</h1>
<p class="mt-1 text-sm text-slate-400">
	Informe seu e-mail para receber um link de recuperação de senha.
</p>

{#if sent}
	<p class="mt-6 text-sm text-slate-50">
		Se existir uma conta com esse e-mail, você receberá um link de recuperação em instantes.
	</p>
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

		{#if errorMessage}
			<p class="text-sm text-red-400" role="alert">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="mt-2 rounded-md bg-indigo-500 px-4 py-2 font-medium text-slate-50 disabled:opacity-60"
		>
			{loading ? 'Enviando...' : 'Enviar link de recuperação'}
		</button>
	</form>
{/if}

<p class="mt-6 text-sm text-slate-400">
	Lembrou a senha?
	<a href={resolve('/login')} class="text-indigo-400 hover:text-indigo-300">Voltar para o login</a>
</p>
