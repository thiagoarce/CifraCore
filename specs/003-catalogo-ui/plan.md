# Plan 003 — Catálogo e UI Base

## Decisões Técnicas

- **Temas via classe `dark` do Tailwind** (`darkMode: 'class'`), com `$theme` store aplicando a classe no `<html>`. Tokens semânticos no `tailwind.config` (ex: `chord`, `surface`, `surface-raised`) mapeando para as paletas do spec — componentes usam tokens, não cores cruas.
- **Rotas:**

```
src/routes/(app)/
├── +layout.svelte            # AppShell: sidebar + header + slot
├── dashboard/+page.svelte    # catálogo da banda ativa
├── songs/[id]/+page.svelte   # tela da música
└── import/                   # (da 002)
```

- **Componentes:**

```
$lib/components/
├── ui/            # Button, Card, Tabs, Modal, Input, Badge (genéricos)
├── song/
│   ├── SongHeader.svelte        # título + controles de tom (disabled por ora)
│   ├── InstrumentTabs.svelte    # abas derivadas das song_tabs existentes
│   ├── AstRenderer.svelte       # blocos AST → HTML (texto puro nesta fase)
│   ├── VoiceSelector.svelte     # duetos
│   └── FloatingFooter.svelte    # sugestão/líder/modo palco (placeholders)
└── layout/Sidebar.svelte
```

- **`AstRenderer` é o componente mais importante do app** — nasce aqui renderizando texto puro e ganha camadas nas fases seguintes (004: acordes/transposição; 006: auto-scroll). Manter contrato de props estável: `blocks: ASTBlock[]`, `activeVoice?: string`. Deve renderizar com `{#each blocks as block (block.id)}` desde já (Lei 6).
- **Busca de músicas:** filtro client-side no MVP (catálogos de banda são pequenos); query com `ilike` se passar de ~200 itens.
- **Dados via `+page.server.ts`** (load functions) com o cliente Supabase de `locals` — RLS garante o escopo; a UI não filtra segurança, só exibe.

## Riscos Específicos

- Fidelidade visual do conteúdo: cifras dependem de alinhamento monoespaçado entre linha de acorde e linha de letra. Área de conteúdo usa fonte mono (`font-mono`) e preserva espaços (`whitespace-pre`), senão os acordes desalinham da sílaba.
