<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let inviteEmail = $state('');
	let inviting = $state(false);
	let inviteError = $state<string | null>(null);
	let inviteSuccess = $state<string | null>(null);

	let leaving = $state(false);

	function mapInviteError(message: string): string {
		const raw = message.toLowerCase();
		if (raw.includes('only band admins can invite members')) {
			return 'Apenas administradores podem convidar membros.';
		}
		if (raw.includes('no user found with this e-mail') || raw.includes('no user found')) {
			return 'Nenhum usuário encontrado com esse e-mail.';
		}
		return 'Não foi possível convidar este membro.';
	}

	async function handleInvite(event: SubmitEvent) {
		event.preventDefault();
		inviteError = null;
		inviteSuccess = null;
		inviting = true;

		const { error } = await data.supabase.rpc('invite_band_member', {
			target_band: data.band.id,
			member_email: inviteEmail
		});

		inviting = false;

		if (error) {
			inviteError = mapInviteError(error.message);
			return;
		}

		inviteSuccess = 'Membro convidado com sucesso.';
		inviteEmail = '';
		await invalidate('app:band-members');
	}
</script>

<main class="min-h-screen bg-surface p-6 text-content">
	<div class="mx-auto max-w-2xl">
		<a href={resolve('/bands')} class="text-sm text-content-muted hover:text-content">
			&larr; Minhas Bandas
		</a>

		<h1 class="mt-4 text-xl font-semibold">{data.band.name}</h1>

		<section class="mt-6 rounded-lg bg-surface-raised p-4">
			<h2 class="text-sm font-medium text-content">Membros</h2>
			<ul class="mt-3 flex flex-col gap-2">
				{#each data.members as member (member.id)}
					<li class="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
						<span>
							{member.userId === data.user?.id ? 'Você' : member.userId}
							<span class="text-content-muted">
								· {member.role === 'admin' ? 'Admin' : 'Membro'}
								{#if member.instrument}
									· {member.instrument}
								{/if}
							</span>
						</span>
					</li>
				{/each}
			</ul>
		</section>

		{#if data.isAdmin}
			<section class="mt-6 rounded-lg bg-surface-raised p-4">
				<h2 class="text-sm font-medium text-content">Convidar membro</h2>
				<form class="mt-3 flex gap-2" onsubmit={handleInvite}>
					<input
						type="email"
						name="inviteEmail"
						required
						placeholder="E-mail do músico"
						bind:value={inviteEmail}
						class="h-11 flex-1 rounded-md border border-border bg-surface px-3 text-content outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent"
					/>
					<button
						type="submit"
						disabled={inviting}
						class="h-11 cursor-pointer rounded-md bg-accent px-4 text-sm font-medium text-accent-content transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{inviting ? 'Convidando...' : 'Convidar'}
					</button>
				</form>
				{#if inviteError}
					<p class="mt-2 text-sm text-danger" role="alert">{inviteError}</p>
				{/if}
				{#if inviteSuccess}
					<p class="mt-2 text-sm text-content-muted">{inviteSuccess}</p>
				{/if}
			</section>
		{/if}

		<section class="mt-6">
			<form
				method="POST"
				action="?/leave"
				use:enhance={() => {
					leaving = true;
					return async ({ update }) => {
						await update();
						leaving = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={leaving}
					class="h-11 cursor-pointer rounded-md border border-border px-4 text-sm text-content hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
				>
					{leaving ? 'Saindo...' : 'Sair da banda'}
				</button>
			</form>
			{#if form?.leaveError}
				<p class="mt-2 text-sm text-danger" role="alert">{form.leaveError}</p>
			{/if}
		</section>
	</div>
</main>
