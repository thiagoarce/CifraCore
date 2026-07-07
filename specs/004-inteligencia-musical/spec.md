# Spec 004 — Inteligência Musical: Acordes, Transposição, Capo e Unroll

## Intenção

Transformar o texto da cifra em conteúdo musical vivo: acordes detectados e destacados com a cor do tema, transposição de tom em ±1 semitom, suporte a capotraste, tom preferido da banda e desdobramento linear (unroll) de repetições — tudo sem jamais quebrar a tela (Lei 4).

## Requisitos

- **R1.** Wrapper defensivo `tonalWrapper` sobre `@tonaljs/tonal`: separa nota fundamental de sufixo e baixo (`C#m7/G#` → `C#` + `m7` + `/G#`), transpõe por semitons e devolve a string formatada. Se a entrada não for um acorde reconhecível **após sanitização**, devolve o texto original intocado — nunca lança exceção.
- **R2.** Sanitizer de acordes (camada regex antes do Tonal): normaliza anomalias comuns da web — espaços internos, parênteses (`A(add9)`), acidentes em unicode (`♯`/`♭`), notação truncada de inversões. Cifra bruta **nunca** chega crua ao Tonal (risco R1 do PLAN.md).
- **R3.** Detecção de acordes no conteúdo: linhas classificadas como linha-de-acordes têm cada token de acorde envolvido em elemento estilizado (`text-amber-400` no dark / `text-blue-600` no light — tokens do design system).
- **R4.** Transposição na UI: botões `[-] Tom [+]` do header (spec 003) ficam funcionais; o tom exibido parte de `preferred_key` (se definido) ou `original_key`; o offset ao vivo é local (não persiste automaticamente); admin tem ação "Salvar como tom da banda" que grava `preferred_key`.
- **R5.** Capo: campo `capo` da música desloca a **exibição** dos acordes (acorde escrito = tom soante transposto para baixo pelo capo); indicador visível "Capo: 2ª casa". Alterar capo na UI é ação de admin e persiste em `songs.capo`.
- **R6.** `$renderedAST`: derived store que aplica sanitização + transposição + capo sobre o AST original **sem mutá-lo**; recalcula quando tom/capo/AST mudam.
- **R7.** Unroll: `unrollAst(blocks: ASTBlock[]): ASTBlock[]` em `$lib/utils/` — expande `repeats` em blocos repetidos com ids derivados únicos (`{id}#2`), computado na camada de dados antes do render (Lei 6). O `AstRenderer` passa a consumir o array desdobrado.

## Cenários de Comportamento (Gherkin)

**Cenário: Transposição básica**
- **Dado** a cifra com acordes `Am`, `C`, `G`
- **Quando** o usuário toca `[+]` uma vez
- **Então** a tela exibe `A#m` (ou `Bbm` conforme preferência enarmônica do wrapper), `C#`, `G#`
- **E** o AST original no banco permanece inalterado.

**Cenário: Acorde sujo não quebra a tela**
- **Dado** um conteúdo com o token `A(add9`(malformado) numa linha de acordes
- **Quando** o usuário transpõe o tom
- **Então** os acordes válidos da linha transpõem
- **E** o token malformado permanece como texto puro original, sem destaque e sem erro no console.

**Cenário: Tom preferido da banda**
- **Dado** que "Tempo Perdido" tem `original_key: C` e `preferred_key: D`
- **Quando** qualquer membro abre a música
- **Então** os acordes exibem no tom D (offset +2 aplicado por padrão).

**Cenário: Capo**
- **Dado** `preferred_key: D` e `capo: 2`
- **Quando** a música abre na aba Cifra
- **Então** o indicador mostra "Capo: 2ª casa" e os acordes escritos aparecem em C (soando D).

**Cenário: Unroll de refrão**
- **Dado** um AST com refrão `repeats: 3`
- **Quando** a tela renderiza
- **Então** o refrão aparece 3 vezes em sequência, cada instância com key única no DOM
- **E** a expansão foi computada uma única vez (não por frame/por render).

## Critérios de Aceitação

- [ ] `tonalWrapper` + sanitizer com suíte de testes: entrada vazia, acordes válidos (maiores, menores, 7ª, sus, add, inversões), acordes malformados, unicode, enarmonia. Cobertura 100% dos utils (Lei 2).
- [ ] `unrollAst` testado: repeats 1/N, ids únicos, imutabilidade da entrada.
- [ ] `$renderedAST` testado: não muta origem; reage a mudança de tom/capo.
- [ ] Cenários acima passam manualmente na tela da música.
- [ ] Sem regressão de performance perceptível em música longa (~200 linhas com refrão 4x) em device modesto.

## Fora de Escopo

Diagramas de acorde (backlog), detecção automática de tom pela cifra (backlog), auto-scroll (006).
