<script lang="ts">
	// Placeholders: sugestão/liderança ganham comportamento na 005
	// (setlists-sync), Modo Palco na 006. Renderizados desabilitados aqui
	// só para fixar o layout do wireframe (spec 003 R3).
</script>

<footer
	class="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-surface-raised px-6 py-3"
>
	<button
		type="button"
		disabled
		title="Disponível quando houver uma sessão ao vivo (fase 005)"
		class="h-11 cursor-not-allowed rounded-md border border-border px-3 text-sm text-content-muted opacity-50"
	>
		Sugerir música
	</button>

	<span class="text-sm text-content-muted">Sem sessão ao vivo</span>

	<button
		type="button"
		disabled
		title="Disponível na fase de Modo Palco (fase 006)"
		class="h-11 cursor-not-allowed rounded-md bg-accent px-4 text-sm font-medium text-accent-content opacity-50"
	>
		Modo Palco
	</button>
</footer>
