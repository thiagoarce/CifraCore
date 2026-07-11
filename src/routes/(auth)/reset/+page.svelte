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

<h1 class="text-xl font-semibold text-content">Recuperar senha</h1>
<p class="mt-1 text-sm text-content-muted">
	Informe seu e-mail para receber um link de recuperação de senha.
</p>

{#if sent}
	<p class="mt-6 text-sm text-content">
		Se existir uma conta com esse e-mail, você receberá um link de recuperação em instantes.
	</p>
{:else}
	<form class="mt-6 flex flex-col gap-4" onsubmit={handleSubmit}>
		<label class="flex flex-col gap-1">
			<span class="text-sm text-content-muted">E-mail</span>
			<input
				type="email"
				name="email"
				autocomplete="email"
				required
				bind:value={email}
				class="h-11 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
			/>
		</label>

		{#if errorMessage}
			<p class="text-sm text-danger" role="alert">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="mt-2 h-11 cursor-pointer rounded-md bg-accent px-4 font-medium text-accent-content transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{loading ? 'Enviando...' : 'Enviar link de recuperação'}
		</button>
	</form>
{/if}

<p class="mt-6 text-sm text-content-muted">
	Lembrou a senha?
	<a href={resolve('/login')} class="text-accent hover:opacity-80">Voltar para o login</a>
</p>
