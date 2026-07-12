# Plan 004 — Inteligência Musical

## Decisões Técnicas

- **Pipeline de renderização (ordem fixa):**

```
AST original (banco, imutável)
  → unrollAst()                      # camada de dados, uma vez por música
  → sanitize + transpose (wrapper)   # derived store $renderedAST
  → AstRenderer                      # só exibe; zero teoria musical no componente
```

- **Arquivos:**
  - `$lib/utils/tonalWrapper.ts` — API: `parseChord(raw): ParsedChord | null`, `transposeChord(raw, semitones): string` (devolve `raw` se não parsear), `transposeKey(key, semitones): string`.
  - `$lib/utils/chordSanitizer.ts` — normalizações regex pré-Tonal (separado do wrapper para testar isolado).
  - `$lib/utils/unrollAst.ts`.
  - `$lib/utils/renderedAst.ts` — **_Feito, desvio de arquitetura:_** não é um `derived()` store clássico do Svelte como planejado originalmente, e sim uma **função pura** `computeRenderedAst(blocks, transposeOffset, capo)`. Motivo: o resto do projeto (fases 001-003) já usa `$derived`/`$derived.by` do Svelte 5 diretamente nos componentes para esse tipo de valor computado, nunca os combinadores de store clássicos (`derived()` de `svelte/store`) — manter um store separado aqui teria sido uma segunda forma de fazer a mesma coisa sem motivo. A pureza da função (sem estado interno, sem assinatura reativa própria) também deixou os testes mais simples: chama-se com valores fixos, sem precisar montar um componente ou um store real.
- **Offset, não tom absoluto:** o estado ao vivo é `transposeOffset: number` (semitons) partindo do tom base (`preferred_key ?? original_key`). "Salvar como tom da banda" = `preferred_key := transposeKey(base, offset)` + reset do offset.
- **Capo é só exibição:** `capoShift = -capo` aplicado por cima do offset na hora de formatar o acorde escrito. O tom "soante" mostrado no header não muda com capo.
- **Enarmonia:** usar a direção do movimento para escolher sustenido/bemol (subiu → `#`, desceu → `b`). **_Feito, com correção em relação ao plano original:_** a ideia inicial era usar o `transpose`/`Interval` do próprio Tonal com exceções via `simplify`. Na prática o `Interval` do Tonal sempre escolhe a mesma qualidade de intervalo para um dado número de semitons (ex: +1 semitom = sempre 2ª menor), o que gera acidentes duplos absurdos ao transpor um acorde que já tem acidente (`Db` +1 semitom vira `Ebb`). `simplify` não resolve isso porque o problema é a escolha do intervalo, não a necessidade de simplificação depois. Abandonado o transpose do Tonal inteiramente em favor de aritmética direta de classe de altura (0–11, via `Note.get(...).chroma`) com tabela de nomes sustenido/bemol fixa (`SHARP_NAMES`/`FLAT_NAMES`) escolhida pela direção do movimento — bate exatamente com o cenário Gherkin "Transposição básica" (Am/C/G subindo 1 semitom → A#m/C#/G#). Documentado nos testes de `tonalWrapper.spec.ts`.
- **Guarda de falso positivo (achado não antecipado no plano original):** o Tonal é case-insensitive — `Chord.get('a')`/`Chord.get('e')` parseiam como A/E maior. Como cifra sempre escreve a fundamental maiúscula, e "a"/"e" são duas das palavras mais comuns do português, `parseChord` rejeita qualquer fundamental que não comece com A-G maiúsculo antes de chamar o Tonal — sem essa guarda, uma fração grande de letras em português seria destacada como acorde por engano. Achado escrevendo um teste com uma frase comum em português ("A vida é bela"), não uma hipótese abstrata.
- **Performance (risco R6):** memoizar por música: `unrollAst` roda no load; `$renderedAST` recalcula apenas quando offset/capo mudam (não por bloco). Tokens de acorde detectados uma vez por bloco e cacheados junto do bloco desdobrado (`ParsedLine[]`), para a transposição só reformatar strings. **_Ver T6 em tasks.md:_** medido contra build de produção sob CPU throttle 4x, a abertura da tela (~1.16s) e a troca de tom (~195-223ms) ficaram acima da meta (<1s / <100ms), mas o custo computacional puro de `computeRenderedAst` isolado (via `vitest bench`) é de ~7ms — a pipeline desta fase não é o gargalo; o gargalo é re-render do Svelte + paint sob throttle e round-trips de rede. Decisão de otimizar (ex: virtualização de lista) fica para reavaliação futura deste plan, não foi feita unilateralmente.

## Contratos

```typescript
// $lib/types/music.ts
export interface ParsedChord {
	root: string; // "C#"
	suffix: string; // "m7"
	bass?: string; // "G#" (inversão)
}

export interface RenderedLine {
	kind: 'chords' | 'lyrics' | 'mixed';
	segments: Array<{ text: string; isChord: boolean }>;
	role?: string;
}
```

## Riscos Específicos (de PLAN.md R1 e R6)

- Cifras sujas: o sanitizer é a única defesa entre a web e o Tonal; casos reais devem virar fixtures de teste continuamente (arquivo `chordSanitizer.fixtures.ts` cresce a cada bug encontrado). **Primeiro caso real registrado (T1):** o shorthand brasileiro de sétima maior `7M` (ex: `C7M`) não é reconhecido pelo Tonal (`Chord.get('C7M')` retorna vazio) — apareceu literalmente em conteúdo real importado do CifraClub durante os testes da fase 002 ("C7M Am7 Bm7 Em"). Sanitizer normaliza `7M` → `M7` antes de chamar o Tonal.
- DOM gigante pós-unroll: mitigado pela memoização acima; se ainda engasgar, avaliar virtualização de lista (decisão futura → atualizar este plan antes). **Confirmado como o risco real (T6):** sob CPU throttle 4x contra build de produção, abertura ~1.16s e troca de tom ~195-223ms ficaram acima da meta, mas isolado o cálculo puro (~7ms) não é o problema — é render/paint de ~168 nós DOM. Virtualização de lista no `AstRenderer` é o candidato natural se a meta precisar ser batida sob esse throttle; não implementada ainda, decisão fica para quem revisar o relatório do T6.
