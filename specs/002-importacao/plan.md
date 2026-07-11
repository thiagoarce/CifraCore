# Plan 002 — Importação

## Decisões Técnicas

- **Um parser, três entradas.** `parseChordSheet` vive em `$lib/utils/chordSheetParser.ts` (função pura, testável). A Edge Function reimplementa apenas a _extração_ do HTML (título, artista, tom, texto bruto) e reutiliza a mesma lógica de blocos — o código do parser é compartilhado via cópia controlada em `supabase/functions/_shared/` (Deno não importa de `$lib`; manter os dois sincronizados é responsabilidade da tarefa, com o mesmo arquivo de casos de teste).
- **Strategy Pattern na Edge Function** (`_shared/` no nível de `supabase/functions/`, não dentro de `import-tab/`, pois é o local convencional para código compartilhado entre múltiplas Edge Functions):

```
supabase/functions/
├── _shared/
│   ├── ast.ts            # cópia controlada de $lib/types/ast.ts
│   ├── parser.ts         # cópia controlada de $lib/utils/chordSheetParser.ts
│   └── parser.test.ts    # mesmos casos de teste do .spec.ts, portados para Deno.test
└── import-tab/
    ├── index.ts                    # roteia por domínio da URL, chama estratégia + parser, monta resposta
    ├── index.test.ts               # validação/roteamento/erros (fetch mockado, sem rede)
    └── strategies/
        ├── cifraclub.ts             # extração específica (dependency-free, regex sobre HTML)
        ├── cifraclub.test.ts        # teste de contrato via fixture
        └── __fixtures__/
            └── cifraclub-sample.html  # fixture SINTÉTICA (estrutura real, letra inventada — ver nota abaixo)
```

- **Toolchain Deno:** `supabase/functions/` roda em Deno, não no toolchain Node/Prettier/ESLint do resto do repo — formatação e lint via `deno fmt` / `deno lint`, testes via `deno test --allow-read` (a suíte de `index.test.ts` mocka `globalThis.fetch`, nunca bate na rede). O diretório está excluído do `.prettierignore`/`eslint.config.js`. Comandos registrados no `CLAUDE.md`.
- **Fixture sintética, não a página real:** durante a implementação, uma página real do CifraClub foi buscada para entender a estrutura exata do HTML (tags/classes: `h1.t1`, link de artista `/{slug}/`, `#cifra_tom`, `<pre>` com acordes em `<b>` e diagramas de tablatura em `<span class="tablatura">`). A fixture versionada reproduz essa estrutura fielmente, mas com título/artista/letra **inventados** — página real contém letra protegida por direitos autorais, e o risco R5 já trata conteúdo importado como uso privado, não para ser versionado no repositório.
- **Reconhecimento de "Nth Parte":** ao validar contra uma página real, descobriu-se que o padrão de rótulo mais comum do CifraClub para versos é "Primeira Parte", "Segunda Parte", "Terceira Parte" etc. (ordinal + "Parte"), não "Parte N" como o heurístico original previa. O `LABEL_PATTERN` foi estendido (nas duas cópias, `$lib/utils/chordSheetParser.ts` e `supabase/functions/_shared/parser.ts`, com o mesmo caso de teste em ambas as suítes) para reconhecer ordinais de "primeira" a "décima" antes de "parte", mapeando para `type: 'verse'`. Sem isso, praticamente uma música inteira colapsava num único bloco.
- **Defesa contra comentários HTML:** `extractCifraClub` remove `<!-- ... -->` antes de qualquer regex de tag (`stripComments`), para não confundir texto dentro de comentários com marcação real — achado durante o desenvolvimento (a própria fixture, antes de ajustada, continha a palavra `<pre>` dentro do comentário explicativo e foi capturada por engano).

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
