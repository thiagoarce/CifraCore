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
- **Tela de Rascunho:** rota `/(app)/import`, estado local (não persiste rascunho no MVP). Campos: title, artist, original_key, instrument alvo da tab, lista de blocos (editar label/type/repeats/role/conteúdo, reordenar via botões ↑/↓, remover). Reordenação por drag-and-drop fica de fora do MVP (custo de dependência não justificado; botões cumprem o requisito "reordenar" do spec).
- **RPC `import_song` (transação real):** dois `INSERT` client-side separados (`songs` depois `song_tabs`) não são atômicos — se o segundo falhar, sobra uma música sem tab. Em vez disso, "Aprovar e Gravar" chama uma RPC `security invoker` (mesmo padrão de `create_band`/`invite_band_member`, spec 001) que faz os dois inserts numa transação Postgres:

```sql
import_song(target_band uuid, song_title text, song_artist text, song_original_key text, tab_instrument instrument, tab_content jsonb) returns uuid
```

Roda com o privilégio de quem chama (RLS de `songs`/`song_tabs` — admin-only — se aplica normalmente); valida título não vazio e `tab_content` como array não vazio; devolve o `song_id` criado. Sem `SECURITY DEFINER`: não eleva privilégio, só agrupa as duas escritas.

- **Sem instrument.enum "cifra" mágico:** o seletor de instrumento no Rascunho lista o enum `instrument` completo (`vocal, guitar, bass, drums, keys, cifra`), com `cifra` pré-selecionado por padrão (é o formato mais comum do que se cola/importa: letra com acordes inline).
- **Permissão:** import (RPC `import_song`) é escrita em `songs`/`song_tabs`, logo admin-only por RLS (spec 001). A UI verifica `role === 'admin'` da banda ativa (mesmo padrão de `bands/[id]`) e mostra aviso em vez do formulário para `member`, evitando uma chamada que a RLS rejeitaria de qualquer forma.
- **Pós-gravação:** redireciona para `/dashboard` (não existe tela de música ainda — spec 003) com mensagem de sucesso local.
- **`import_song` estendido para URL + dedupe (T4):** dois parâmetros novos, ambos com default `null` para não quebrar a chamada já existente do Modo Avançado (T2): `song_source_url text default null` e `existing_song_id uuid default null`.
  - `existing_song_id is null` (caminho normal — paste ou URL nova): comportamento de antes, agora também gravando `source_url` quando vier da URL.
  - `existing_song_id` informado (usuário escolheu "Sobrescrever" no aviso de duplicata): em vez de INSERT em `songs`, faz UPDATE dos metadados (título/artista/tom) na música existente — **confirma `band_id = target_band` antes**, para não sobrescrever música de outra banda — e faz UPSERT em `song_tabs` (`on conflict (song_id, instrument) do update`), permitindo tanto substituir a tab do mesmo instrumento quanto adicionar uma tab de outro instrumento à música já existente. Continua uma transação só.
  - Dedupe é checado client-side (SELECT simples em `songs` por `band_id`+`source_url`, já coberto pelo RLS de leitura) antes de abrir o Rascunho; se encontrar, mostra o aviso do R6 (Sobrescrever / Cancelar) em vez de ir direto pro Rascunho.
- **Limitação de ambiente:** o container `edge-runtime` do Supabase local não inicia neste sandbox de desenvolvimento (`error setting rlimits for ready process: error setting rlimit type 7: operation not permitted` — restrição de capacidades do container, não um bug do projeto). Por isso `supabase start` roda com `-x edge-runtime`, e o fluxo de URL na UI foi verificado com a rede mockada no navegador (Playwright `page.route`), simulando as respostas reais da Edge Function — cujo contrato já está coberto pelos 26 testes Deno da T3 (incluindo uma verificação manual contra uma URL real do CifraClub). Quando `import-tab` for implantado no Supabase hospedado (não local), o fluxo completo volta a ser end-to-end de verdade.
- **`batch-import.js`:** Node puro na raiz, usa `@supabase/supabase-js` com `SUPABASE_SERVICE_KEY` (env). Formato do `repertorio.txt`: uma entrada por linha, `Título; Artista; URL-ou-ARQUIVO.txt`. Linhas iniciadas com `#` são comentário. URLs passam pela Edge Function; caminhos locais passam pelo parser. Grava direto (sem HITL — uso consciente de bootstrap, documentado no help do script).

## Contratos

Payload da Edge Function: definido no `PLAN.md` §4 (não duplicar aqui). Erro estruturado:

```json
{ "success": false, "error": { "code": "BLOCKED" | "PARSE_FAILED" | "UNSUPPORTED_SOURCE" | "FETCH_FAILED", "message": "..." } }
```

## Riscos Específicos (de PLAN.md R5)

- CifraClub pode mudar HTML sem aviso ou bloquear via WAF. Mitigações: User-Agent de navegador real; teste de contrato com fixture HTML versionada no repo (não bater na rede em CI); erro estruturado sempre aponta o usuário para o Modo Avançado.
- Direitos autorais: conteúdo importado é para uso privado da banda; não há catálogo público nem compartilhamento entre tenants.
