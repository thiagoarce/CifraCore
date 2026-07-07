# Tasks 002 — Importação

Depende de: 001 (schema, auth). Ordem de cima para baixo.

- [ ] **T1 `[FABLE]` Parser texto→AST** — `$lib/utils/chordSheetParser.ts` + suíte de testes (Lei 2: testes primeiro). Casos: seções rotuladas PT/EN, repetições (`2x`, `(bis)`), linhas de acorde vs. letra, texto sem estrutura, texto vazio, caracteres especiais.
      **DoD:** 100% dos casos passam; nunca lança exceção; texto de entrada sempre recuperável por concatenação dos blocos.

- [ ] **T2 `[SONNET]` Tela do Modo Avançado + Rascunho** — rota `/import`: textarea → chama `parseChordSheet` → Tela de Rascunho (editar title/artist/key/blocos, reordenar, remover) → "Aprovar e Gravar" insere `songs` + `song_tabs`. Seguir contrato `ASTBlock` do `PLAN.md` §4 à risca.
      **DoD:** cenários Gherkin "Colar texto vira AST" e "Validação humana" (parte do Rascunho) passam manualmente; gravação cria as duas linhas corretamente.

- [ ] **T3 `[FABLE]` Edge Function `import-tab` (estratégia CifraClub)** — Strategy Pattern, extração de título/artista/tom/texto, parser compartilhado, User-Agent real, erros estruturados. Fixture HTML do CifraClub versionada para teste de contrato.
      **DoD:** teste com fixture passa; URL real retorna Draft válido; 403/HTML inesperado retornam `{ success: false, error }` sem crash.

- [ ] **T4 `[SONNET]` Fluxo de importação por URL na UI** — campo de URL na rota `/import`, chamada à Edge Function, roteia o Draft para a mesma Tela de Rascunho do T2; em erro, exibe mensagem e botão "Colar cifra manualmente"; checagem de duplicata por `source_url` (avisar sobrescrever/cancelar).
      **DoD:** cenários "Validação humana de cifra importada por URL" e "Scraper bloqueado degrada para Modo Avançado" passam manualmente.

- [ ] **T5 `[SONNET]` Script `batch-import.js`** — conforme plan (formato `Título; Artista; URL-ou-arquivo`, comentários `#`, service key via env, relatório de falhas sem abortar lote). Criar `repertorio.example.txt`. Teste unitário do parser de linhas do arquivo.
      **DoD:** cenário "Importação em lote" passa contra banco local; `node batch-import.js --help` documenta uso e o aviso de bypass do HITL.
