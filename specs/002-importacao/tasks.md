# Tasks 002 — Importação

Depende de: 001 (schema, auth). Ordem de cima para baixo.

- [x] **T1 `[FABLE]` Parser texto→AST** — `$lib/utils/chordSheetParser.ts` + suíte de testes (Lei 2: testes primeiro). Casos: seções rotuladas PT/EN, repetições (`2x`, `(bis)`), linhas de acorde vs. letra, texto sem estrutura, texto vazio, caracteres especiais.
      **DoD:** 100% dos casos passam; nunca lança exceção; texto de entrada sempre recuperável por concatenação dos blocos.
      _Feito. 14 testes em `chordSheetParser.spec.ts` (escritos antes da implementação). Dois modos: blocos rotulados (`buildLabeledBlocks`, com bloco sintético "Parte 1" para conteúdo antes do primeiro rótulo) e fallback por parágrafo quando nenhum rótulo é reconhecido (`buildParagraphBlocks`, split em linhas em branco duplas). Rótulos reconhecidos: colchetes `[X]` (com conteúdo inline após), parênteses `(X)`, dois-pontos `X:`, ou linha inteira `X`; regex ancorada evita falso positivo em letras que começam com a palavra-chave (ex: "Solo na madrugada..."). Repetições: `2x`, `x2`, `(2x)`, `(bis)`. Nunca lança exceção; texto sem estrutura vira bloco único verbatim._
      _Atualização (durante T3): validação contra página real do CifraClub revelou que o rótulo mais comum lá é "Primeira Parte"/"Segunda Parte"/etc. (ordinal + Parte), não reconhecido originalmente. `LABEL_PATTERN` estendido para esse caso (mapeado para `type: 'verse'`), com teste adicional; 19 testes no total agora. Mudança replicada na cópia Deno (`_shared/parser.ts`, T3)._

- [ ] **T2 `[SONNET]` Tela do Modo Avançado + Rascunho** — rota `/import`: textarea → chama `parseChordSheet` → Tela de Rascunho (editar title/artist/key/blocos, reordenar, remover) → "Aprovar e Gravar" insere `songs` + `song_tabs`. Seguir contrato `ASTBlock` do `PLAN.md` §4 à risca.
      **DoD:** cenários Gherkin "Colar texto vira AST" e "Validação humana" (parte do Rascunho) passam manualmente; gravação cria as duas linhas corretamente.

- [x] **T3 `[FABLE]` Edge Function `import-tab` (estratégia CifraClub)** — Strategy Pattern, extração de título/artista/tom/texto, parser compartilhado, User-Agent real, erros estruturados. Fixture HTML do CifraClub versionada para teste de contrato.
      **DoD:** teste com fixture passa; URL real retorna Draft válido; 403/HTML inesperado retornam `{ success: false, error }` sem crash.
      _Feito. `supabase/functions/import-tab/` (`index.ts` + `strategies/cifraclub.ts`) e `supabase/functions/_shared/` (cópia controlada do parser + tipo AST). 26 testes Deno (12 do parser portados + 8 de roteamento/erro do `index.ts` com `fetch` mockado + 5 de extração via fixture + 1 de fixture de segurança contra comentários HTML), todos offline (nenhum bate na rede em CI). Extração dependency-free via regex (sem lib de DOM); User-Agent de navegador real; erros mapeados: `INVALID_URL`, `UNSUPPORTED_SOURCE`, `BLOCKED` (403/429), `FETCH_FAILED`, `PARSE_FAILED` — nunca lança. Fixture é **sintética** (mesma estrutura HTML de uma página real, letra inventada — ver plan.md, nota de direitos autorais/R5). Verificado manualmente contra `cifraclub.com.br/legiao-urbana/tempo-perdido/` real: título/artista/tom corretos, 4 blocos AST bem segmentados._

- [ ] **T4 `[SONNET]` Fluxo de importação por URL na UI** — campo de URL na rota `/import`, chamada à Edge Function, roteia o Draft para a mesma Tela de Rascunho do T2; em erro, exibe mensagem e botão "Colar cifra manualmente"; checagem de duplicata por `source_url` (avisar sobrescrever/cancelar).
      **DoD:** cenários "Validação humana de cifra importada por URL" e "Scraper bloqueado degrada para Modo Avançado" passam manualmente.

- [ ] **T5 `[SONNET]` Script `batch-import.js`** — conforme plan (formato `Título; Artista; URL-ou-arquivo`, comentários `#`, service key via env, relatório de falhas sem abortar lote). Criar `repertorio.example.txt`. Teste unitário do parser de linhas do arquivo.
      **DoD:** cenário "Importação em lote" passa contra banco local; `node batch-import.js --help` documenta uso e o aviso de bypass do HITL.
