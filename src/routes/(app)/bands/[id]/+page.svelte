<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data } = $props();

	let inviteEmail = $state('');
	let inviting = $state(false);
	let inviteError = $state<string | null>(null);
	let inviteSuccess = $state<string | null>(null);

	let leaving = $state(false);
	let leaveError = $state<string | null>(null);

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

	async function handleLeave() {
		leaveError = null;
		leaving = true;

		const { error } = await data.supabase
			.from('band_members')
			.delete()
			.eq('band_id', data.band.id)
			.eq('user_id', data.user!.id);

		leaving = false;

		if (error) {
			leaveError = 'Não foi possível sair da banda.';
			return;
		}

		await invalidate('app:bands');
		goto(resolve('/bands'));
	}
</script>

<main class="min-h-screen bg-slate-900 p-6 text-slate-50">
	<div class="mx-auto max-w-2xl">
		<a href={resolve('/bands')} class="text-sm text-slate-400 hover:text-slate-50">
			&larr; Minhas Bandas
		</a>

		<h1 class="mt-4 text-xl font-semibold">{data.band.name}</h1>

		<section class="mt-6 rounded-lg bg-slate-800 p-4">
			<h2 class="text-sm font-medium text-slate-50">Membros</h2>
			<ul class="mt-3 flex flex-col gap-2">
				{#each data.members as member (member.id)}
					<li class="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-sm">
						<span>
							{member.userId === data.user?.id ? 'Você' : member.userId}
							<span class="text-slate-400">
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
			<section class="mt-6 rounded-lg bg-slate-800 p-4">
				<h2 class="text-sm font-medium text-slate-50">Convidar membro</h2>
				<form class="mt-3 flex gap-2" onsubmit={handleInvite}>
					<input
						type="email"
						name="inviteEmail"
						required
						placeholder="E-mail do músico"
						bind:value={inviteEmail}
						class="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-50 outline-none focus:border-indigo-500"
					/>
					<button
						type="submit"
						disabled={inviting}
						class="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-60"
					>
						{inviting ? 'Convidando...' : 'Convidar'}
					</button>
				</form>
				{#if inviteError}
					<p class="mt-2 text-sm text-red-400" role="alert">{inviteError}</p>
				{/if}
				{#if inviteSuccess}
					<p class="mt-2 text-sm text-slate-400">{inviteSuccess}</p>
				{/if}
			</section>
		{/if}

		<section class="mt-6">
			<button
				type="button"
				onclick={handleLeave}
				disabled={leaving}
				class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-50 hover:border-red-400 disabled:opacity-60"
			>
				{leaving ? 'Saindo...' : 'Sair da banda'}
			</button>
			{#if leaveError}
				<p class="mt-2 text-sm text-red-400" role="alert">{leaveError}</p>
			{/if}
		</section>
	</div>
</main>
