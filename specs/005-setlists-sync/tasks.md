# Tasks 005 — Setlists e Sincronia

Depende de: 001 (schema/RLS), 003 (tela da música), 004 (renderização com tom). Ordem de cima para baixo.

- [x] **T1 `[SONNET]` CRUD de setlists** — telas lista/edição, adicionar/remover músicas do catálogo, reordenar (persistindo `position` via RPC `reorder_setlist` — criar a RPC segundo o plan), data do evento.
      **DoD:** reordenação sobrevive a reload; member vê mas não edita (RLS por baixo).
      _Feito. Migração `20260707000006_reorder_setlist.sql`: RPC `security invoker` com checagem explícita de admin (`raise exception 'setlist not found in this band'`) em vez de deixar a RLS da `UPDATE` filtrar silenciosamente — decisão deliberada para que um member que chame a RPC por engano veja um erro claro, não um no-op que parece sucesso. `(app)/setlists/+page.svelte` (lista, client-side igual ao dashboard — `$currentBand` só existe no localStorage) e `(app)/setlists/[id]/+page.ts`+`+page.svelte` (edição: nome/data via RLS admin-only, adicionar música do catálogo da banda, remover, reordenar com botões ↑/↓ chamando `reorder_setlist`). `isAdmin` computado a partir de `bands` do layout pai, mesmo padrão de `songs/[id]/+layout.ts`. Item nav "Setlists" adicionado à `Sidebar`._
      _**Achado real de semântica de RLS, não hipotético:** a suposição inicial era que uma `UPDATE`/`DELETE` bloqueada por RLS lançaria erro `42501` igual a um `INSERT` bloqueado — não é o caso. A cláusula `using` de `UPDATE`/`DELETE` apenas torna a linha invisível para a escrita (0 linhas afetadas, sem exceção); só o `with check` de `INSERT` de fato lança. Descoberto escrevendo os testes pgTAP (`003_setlists.sql`) — os dois primeiros `throws_ok` para member-update e member-delete falharam com "caught: no exception", corrigidos para `lives_ok` + assert de que nada mudou. Por isso o RPC `reorder_setlist` tem a checagem explícita acima em vez de confiar no comportamento padrão do `UPDATE`._
      _Verificado com Playwright contra dados reais no stack local: admin cria setlist, adiciona 3 músicas, reordena (persiste após reload), remove uma; member vê a lista e a música mas não vê nenhum controle de edição (nome/data, adicionar, reordenar, remover) — a UI simplesmente não renderiza os controles quando `isAdmin` é falso, e a RLS por baixo garante que mesmo uma chamada direta seria bloqueada (10 asserts pgTAP novos em `003_setlists.sql`, 38 no total entre os três arquivos de teste do banco)._

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
