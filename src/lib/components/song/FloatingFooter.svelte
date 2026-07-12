<script lang="ts">
	interface SessionFooterInfo {
		isLeader: boolean;
		leaderName: string;
		onTakeLeadership: () => void;
		presentEmails: string[];
	}

	interface Props {
		session?: SessionFooterInfo | null;
	}

	let { session = null }: Props = $props();
</script>

<footer
	class="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-raised px-6 py-3"
>
	<button
		type="button"
		disabled
		title="Disponível quando houver uma sessão ao vivo (fase 005-T5)"
		class="h-11 cursor-not-allowed rounded-md border border-border px-3 text-sm text-content-muted opacity-50"
	>
		Sugerir música
	</button>

	{#if session}
		<div class="flex flex-wrap items-center gap-3">
			<span class="text-sm text-content-muted">
				Líder: <span class="font-medium text-content">{session.leaderName}</span>
			</span>
			<span class="text-sm text-content-muted" title={session.presentEmails.join(', ')}>
				{session.presentEmails.length} conectado{session.presentEmails.length === 1 ? '' : 's'}
			</span>
			{#if !session.isLeader}
				<button
					type="button"
					onclick={session.onTakeLeadership}
					class="h-11 cursor-pointer rounded-md border border-border px-3 text-sm text-content hover:border-accent"
				>
					Assumir Liderança
				</button>
			{/if}
		</div>
	{:else}
		<span class="text-sm text-content-muted">Sem sessão ao vivo</span>
	{/if}

	<button
		type="button"
		disabled
		title="Disponível na fase de Modo Palco (fase 006)"
		class="h-11 cursor-not-allowed rounded-md bg-accent px-4 text-sm font-medium text-accent-content opacity-50"
	>
		Modo Palco
	</button>
</footer>
