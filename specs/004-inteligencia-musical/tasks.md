# Tasks 004 — Inteligência Musical

Depende de: 003 (`AstRenderer` existente). Ordem de cima para baixo.

- [ ] **T1 `[FABLE]` Sanitizer de acordes** — `$lib/utils/chordSanitizer.ts` + fixtures de casos reais (unicode `♯♭`, `A(add9)`, espaços, inversões truncadas). Testes primeiro (Lei 2).
  **DoD:** 100% de cobertura; toda fixture documenta o caso real que a originou.

- [ ] **T2 `[FABLE]` tonalWrapper** — `parseChord`/`transposeChord`/`transposeKey` sobre `@tonaljs/tonal`, com sanitizer na entrada e fallback para texto original. Regra de enarmonia documentada em teste.
  **DoD:** entrada vazia, acordes válidos, malformados e inversões cobertos; nunca lança; `transposeChord('xyz', 2) === 'xyz'`.

- [ ] **T3 `[FABLE]` unrollAst + detecção de linhas** — `unrollAst` (ids únicos, imutável) e classificador de linhas/segmentos (`RenderedLine`), com cache por bloco.
  **DoD:** testes de repeats 1/N, imutabilidade, ids únicos; classificação correta de linha de acordes vs. letra vs. mista.

- [ ] **T4 `[FABLE]` Store `$renderedAST`** — derived de (AST, offset, capo) usando T1–T3; sem mutação da origem.
  **DoD:** testes: reage a offset/capo; origem intocada; payloads malformados degradam para texto (Lei 4).

- [ ] **T5 `[SONNET]` UI de tom e capo** — ativar botões `[-] Tom [+]` no `SongHeader` (ligados ao offset), exibir tom atual partindo de `preferred_key ?? original_key`, ação admin "Salvar como tom da banda", controle e indicador de capo ("Capo: 2ª casa"), destaque visual dos acordes com tokens do tema no `AstRenderer` (consumindo `RenderedLine` — sem lógica musical no componente).
  **DoD:** cenários Gherkin "Transposição básica", "Tom preferido", "Capo" e "Acorde sujo" passam manualmente nos dois temas.

- [ ] **T6 `[SONNET]` Verificação de performance** — música sintética longa (~200 linhas, refrão 4x); medir troca de tom e abertura em CPU throttled (DevTools 4x).
  **DoD:** abertura < 1s e transposição < 100ms no cenário throttled; senão, reportar para reavaliação do plan (não otimizar por conta própria).
