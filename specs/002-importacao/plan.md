# Plan 002 — Importação

## Decisões Técnicas

- **Um parser, três entradas.** `parseChordSheet` vive em `$lib/utils/chordSheetParser.ts` (função pura, testável). A Edge Function reimplementa apenas a *extração* do HTML (título, artista, tom, texto bruto) e reutiliza a mesma lógica de blocos — o código do parser é compartilhado via cópia controlada em `supabase/functions/_shared/` (Deno não importa de `$lib`; manter os dois sincronizados é responsabilidade da tarefa, com o mesmo arquivo de casos de teste).
- **Strategy Pattern na Edge Function:**

```
supabase/functions/import-tab/
├── index.ts            # roteia por domínio da URL
├── strategies/
│   └── cifraclub.ts    # extração específica
└── _shared/parser.ts
```

- **Heurística do parser (v1):**
  - Linha-rótulo de seção: regex sobre prefixos conhecidos (`intro`, `verso`, `refrão`, `chorus`, `ponte`, `bridge`, `solo`, `final`, `outro`, `parte N`) com ou sem colchetes/dois-pontos.
  - Repetição: sufixos `2x`, `x2`, `(2x)`, `(bis)` na linha-rótulo → `repeats`.
  - Linha de acordes: >60% dos tokens casam com o regex de acorde (`^[A-G][#b]?...`). Não valida teoria musical aqui (isso é spec 004) — só classifica a linha.
  - Blocos delimitados por linhas-rótulo ou por linhas em branco duplas.
  - Fallback: tudo vira um bloco único (nunca lançar exceção — Lei 4).
- **Tela de Rascunho:** rota `/(app)/import`, estado local (não persiste rascunho no MVP). Campos: title, artist, original_key, instrument alvo da tab, lista de blocos (editar label/type/repeats/role/conteúdo, reordenar, remover). "Aprovar e Gravar" = uma transação: INSERT `songs` + INSERT `song_tabs`.
- **`batch-import.js`:** Node puro na raiz, usa `@supabase/supabase-js` com `SUPABASE_SERVICE_KEY` (env). Formato do `repertorio.txt`: uma entrada por linha, `Título; Artista; URL-ou-ARQUIVO.txt`. Linhas iniciadas com `#` são comentário. URLs passam pela Edge Function; caminhos locais passam pelo parser. Grava direto (sem HITL — uso consciente de bootstrap, documentado no help do script).

## Contratos

Payload da Edge Function: definido no `PLAN.md` §4 (não duplicar aqui). Erro estruturado:

```json
{ "success": false, "error": { "code": "BLOCKED" | "PARSE_FAILED" | "UNSUPPORTED_SOURCE" | "FETCH_FAILED", "message": "..." } }
```

## Riscos Específicos (de PLAN.md R5)

- CifraClub pode mudar HTML sem aviso ou bloquear via WAF. Mitigações: User-Agent de navegador real; teste de contrato com fixture HTML versionada no repo (não bater na rede em CI); erro estruturado sempre aponta o usuário para o Modo Avançado.
- Direitos autorais: conteúdo importado é para uso privado da banda; não há catálogo público nem compartilhamento entre tenants.
