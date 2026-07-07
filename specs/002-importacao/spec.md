# Spec 002 — Importação: Modo Avançado, Scraper e HITL

## Intenção

Popular o catálogo com o mínimo de fricção, mas **sempre com revisão humana** (HITL) antes de gravar. Três caminhos de entrada, em ordem de prioridade de construção:

1. **Modo Avançado (primário):** usuário cola o texto da cifra numa textarea; o parser local converte em blocos AST.
2. **Importação por URL (acelerador):** Edge Function raspa a página do CifraClub e devolve o mesmo AST.
3. **Bootstrapping em lote:** script Node.js (`batch-import.js`) lê um `repertorio.txt` local e popula o banco — permite ter dados reais antes de existir UI de catálogo (abordagem Data-First).

Nota de produto: o scraping é conveniência, não dependência (ver PRD §5 e risco R5). O parser texto→AST é o mesmo nos três caminhos.

## Requisitos

- **R1.** Parser `parseChordSheet(text: string): ASTBlock[]` em `$lib/utils/` — função pura, detecta seções (verso/refrão/ponte/solo por heurística de rótulos comuns: "Refrão:", "[Chorus]", "Parte 2" etc.), linhas de acorde vs. linhas de letra, e repetições anotadas ("2x", "(x4)").
- **R2.** Nenhum caminho grava direto: todos convergem para a **Tela de Rascunho**, onde o usuário revisa título, artista, tom, blocos e vozes, e só então clica "Aprovar e Gravar".
- **R3.** Edge Function `import-tab` (Deno) com Strategy Pattern por domínio da URL — MVP implementa só a estratégia CifraClub. Contrato de payload no `PLAN.md` §4.
- **R4.** A Edge Function usa User-Agent de navegador real e devolve erro estruturado (`{ success: false, error: { code, message } }`) quando bloqueada ou quando o HTML mudou — a UI então oferece o Modo Avançado como fallback.
- **R5.** `batch-import.js` roda com `node batch-import.js repertorio.txt` usando service key via variável de ambiente; formato do arquivo definido no plan.
- **R6.** Deduplicação: ao importar por URL, se já existir `songs.source_url` igual na banda, avisar e oferecer sobrescrever a tab ou cancelar.

## Cenários de Comportamento (Gherkin)

### Funcionalidade: Importação Fricção Zero (HITL)

**Cenário: Validação humana de cifra importada por URL**
- **Dado** que o usuário submeteu a URL "cifraclub.com.br/legiao-urbana/tempo-perdido/"
- **Quando** a Edge Function retorna o JSON (AST) da cifra
- **Então** o sistema NÃO faz INSERT nas tabelas `songs`/`song_tabs`
- **E** renderiza a Tela de Rascunho com título, artista, tom e blocos editáveis
- **Quando** o usuário clica em "Aprovar e Gravar"
- **Então** o sistema insere o payload validado em `songs` e `song_tabs` (content_type `'ast'`).

**Cenário: Scraper bloqueado degrada para Modo Avançado**
- **Dado** que o CifraClub respondeu 403 ou o HTML mudou
- **Quando** a Edge Function retorna `{ success: false, error: ... }`
- **Então** a UI exibe o erro de forma amigável
- **E** oferece um botão "Colar cifra manualmente" que abre o Modo Avançado com a mesma tela de destino (Rascunho).

### Funcionalidade: Modo Avançado

**Cenário: Colar texto vira AST**
- **Dado** que o usuário colou uma cifra com seções "Intro", "Verso" e "Refrão (2x)"
- **Quando** ele clica em "Processar"
- **Então** a Tela de Rascunho mostra 3 blocos com `type` correto e `repeats: 2` no refrão
- **E** nenhuma linha do texto original foi perdida (conteúdo íntegro, mesmo o não reconhecido).

**Cenário: Texto irreconhecível não quebra**
- **Dado** um texto sem nenhuma estrutura reconhecível
- **Quando** o parser processa
- **Então** retorna um único bloco `type: 'verse'`, `label: 'Parte 1'` com o texto íntegro (degradação graciosa, Lei 4).

### Funcionalidade: Bootstrapping (Data-First)

**Cenário: Importação em lote**
- **Dado** um `repertorio.txt` com 20 entradas válidas e 2 URLs quebradas
- **Quando** o script roda
- **Então** 20 músicas são inseridas para a banda alvo
- **E** as 2 falhas são reportadas no console com motivo, sem abortar o lote.

## Critérios de Aceitação

- [ ] Parser com suíte de testes cobrindo: seções rotuladas, repetições, cifra sem estrutura, texto vazio, linhas só de acordes.
- [ ] Fluxo URL→Rascunho→Gravar funciona com uma página real do CifraClub.
- [ ] Fluxo falha-do-scraper→Modo Avançado funciona.
- [ ] `batch-import.js` popula banco de teste a partir de arquivo exemplo (`repertorio.example.txt` no repo).

## Fora de Escopo

Ultimate Guitar (backlog), edição rica de AST pós-gravação (edição básica na tela da música, spec 003), detecção de acordes/transposição (spec 004 — aqui o conteúdo é tratado como texto).
