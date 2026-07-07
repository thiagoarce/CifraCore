# Tasks 005 — Setlists e Sincronia

Depende de: 001 (schema/RLS), 003 (tela da música), 004 (renderização com tom). Ordem de cima para baixo.

- [ ] **T1 `[SONNET]` CRUD de setlists** — telas lista/edição, adicionar/remover músicas do catálogo, reordenar (persistindo `position` via RPC `reorder_setlist` — criar a RPC segundo o plan), data do evento.
  **DoD:** reordenação sobrevive a reload; member vê mas não edita (RLS por baixo).

- [ ] **T2 `[FABLE]` Protocolo realtime + store `$liveSession`** — tipos `LiveEvent`, canal `live:{band_id}`, ordem escrita-banco→broadcast, validação/descarte por `leader_timestamp`, reconexão com refetch e reconciliação. Testes unitários da store com payloads mockados (Lei 2).
  **DoD:** testes: rejeita payload sem timestamp, ignora evento obsoleto, reconcilia após "reconexão" simulada; auditoria confirma zero eventos de scroll.

- [ ] **T3 `[FABLE]` Ciclo de vida da sessão + liderança** — iniciar sessão a partir de setlist (quem inicia = líder), trocar música (UPDATE + `CHANGE_SONG`), assumir liderança (UPDATE + `LEADER_CHANGE`), encerrar sessão. Tratamento da corrida de liderança conforme plan.
  **DoD:** cenários "Líder altera a música" (<200ms do evento à troca) e "Tomada de liderança" passam com 2 browsers.

- [ ] **T4 `[SONNET]` Presença + UI da sessão** — Supabase Presence no canal, lista de conectados no `FloatingFooter`, indicador "Líder: {nome}", modos Seguir Líder/Individual com indicador "banda está em outra música" e botão "Voltar a seguir".
  **DoD:** cenários "Membro em modo Individual" e presença refletindo entrada/saída de devices passam manualmente.

- [ ] **T5 `[SONNET]` Fila de sugestões** — botão "Sugerir Música" (busca no catálogo), INSERT em `session_suggestions` + evento `SUGGESTION`, painel do líder (aceitar → vira música corrente e marca `accepted`; dispensar → `dismissed`).
  **DoD:** cenário "Sugestão aceita" passa com 2 browsers; fila persiste (visível após reload do líder).

- [ ] **T6 `[FABLE]` Modo Convidado** — Edge Function `guest-access` (JWT dedicado, exp 24h, endpoints generate/state conforme plan), rota standalone `/guest/[token]` read-only assinando o canal, telas de expirado/inválido.
  **DoD:** cenário "Substituto acompanha o show" passa; testes de segurança: token adulterado rejeitado, token expirado rejeitado, token válido não acessa outras rotas/bandas.

- [ ] **T7 `[FABLE]` Teste de resiliência de rede** — roteiro documentado + execução: queda de rede no meio de troca de música, reconexão, verificação de reconciliação (cenário "Reconexão").
  **DoD:** roteiro em `specs/005-setlists-sync/test-notes.md` com resultado; bugs achados viram fixes antes de fechar a feature.
