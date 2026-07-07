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
  - `$lib/stores/renderedAst.ts` — derived de (AST base, `transposeOffset`, `capo`).
- **Offset, não tom absoluto:** o estado ao vivo é `transposeOffset: number` (semitons) partindo do tom base (`preferred_key ?? original_key`). "Salvar como tom da banda" = `preferred_key := transposeKey(base, offset)` + reset do offset.
- **Capo é só exibição:** `capoShift = -capo` aplicado por cima do offset na hora de formatar o acorde escrito. O tom "soante" mostrado no header não muda com capo.
- **Enarmonia:** usar a direção do movimento para escolher sustenido/bemol (subiu → `#`, desceu → `b`), com exceções via Tonal (`simplify`). Documentar a escolha nos testes — é o tipo de detalhe que gera bug report de músico.
- **Performance (risco R6):** memoizar por música: `unrollAst` roda no load; `$renderedAST` recalcula apenas quando offset/capo mudam (não por bloco). Tokens de acorde detectados uma vez por bloco e cacheados junto do bloco desdobrado (`ParsedLine[]`), para a transposição só reformatar strings.

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

- Cifras sujas: o sanitizer é a única defesa entre a web e o Tonal; casos reais devem virar fixtures de teste continuamente (arquivo `chordSanitizer.fixtures.ts` cresce a cada bug encontrado).
- DOM gigante pós-unroll: mitigado pela memoização acima; se ainda engasgar, avaliar virtualização de lista (decisão futura → atualizar este plan antes).
