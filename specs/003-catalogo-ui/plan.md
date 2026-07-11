# Plan 003 — Catálogo e UI Base

## Decisões Técnicas

- **Temas via variáveis CSS, não `dark:` do Tailwind** (desvio do plano original, que previa `darkMode: 'class'` + variante `dark:`). Como o projeto está no Tailwind v4 (config só via CSS, sem `tailwind.config.js` — ver CLAUDE.md), os tokens semânticos (`--color-surface`, `--color-surface-raised`, `--color-content`, `--color-content-muted`, `--color-voice-inactive`, `--color-chord`, `--color-accent`, `--color-accent-content`, `--color-border`, `--color-danger`) são declarados em `@theme` no `src/routes/layout.css`, com **dark como valor default em `:root`** (R1: dark é o padrão absoluto) e um bloco `:root.light { ... }` sobrescrevendo os mesmos custom properties. Como as utilities do Tailwind (`bg-surface`, `text-content`, etc.) resolvem para `var(--color-surface)` etc., a troca de tema é automática por cascata — **nenhum componente usa o prefixo `dark:`**, todos usam só os tokens semânticos. Store `$theme` (`$lib/stores/theme.ts`, com testes) só faz `classList.toggle('light', ...)` no `<html>` + persiste em `localStorage`; script inline em `app.html` aplica a classe antes do primeiro paint (evita flash) para quem já escolheu light — dark não precisa de script (é o que renderiza sem nenhuma classe).
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

- **`Modal` usa `<dialog>` nativo** (`showModal()`/`close()`), não uma div posicionada a mão — ganha focus trap, ESC e `::backdrop` de graça do navegador. Achado durante QA visual: o Preflight do Tailwind zera `margin` em todos os elementos, o que quebra a centralização default de `dialog::backdrop` (`margin: auto` do UA stylesheet) — corrigido com `m-auto` explícito na classe do `<dialog>`. O scrim usa `backdrop:bg-black/50` (preto puro, não um token do tema) de propósito: um scrim na cor `surface` do tema escuro fica quase invisível sobre o próprio fundo escuro.
- **Fonte do design system:** paletas do spec já batem com a recomendação "Dark Mode (OLED)" da skill `ui-ux-pro-max` (`--design-system` para "band repertoire tool"); tipografia adotada é a família única **Inter** (par "Modern Dark Cinema" da skill — "developer tools, high-end productivity apps", mais alinhada à identidade de ferramenta profissional do CifraCore do que os pares "festival/entretenimento" que a busca por palavras-chave musicais também sugeriu).
- **Bug real encontrado e corrigido durante o QA desta fase (não é do escopo do design system, mas foi achado testando as telas):** login e cadastro chamavam `data.supabase.auth.signInWithPassword`/`signUp` no client e, no sucesso, faziam `await invalidate('supabase:auth'); goto('/dashboard')`. Esse combo é uma race condition real do SvelteKit — confirmado com Playwright contra o stack local: o `goto()` resolve sem erro, o `/dashboard/__data.json` responde 200 (sessão válida, cookies OK), mas a navegação nunca "gruda" (a URL nunca muda). Substituído por **form actions** (`+page.server.ts` com `actions.default`, chamando `signInWithPassword`/`signUp` no `locals.supabase` do servidor e usando `redirect(303, ...)` do próprio SvelteKit) + `use:enhance` no client — um único ciclo de request/response, sem corrida possível. Confirma a diretriz "Use form actions" que a busca `--stack svelte` da skill `ui-ux-pro-max` já apontava. `reset/+page.svelte` manteve a chamada client-side (não navega após o submit, não tem a race).

## Riscos Específicos

- Fidelidade visual do conteúdo: cifras dependem de alinhamento monoespaçado entre linha de acorde e linha de letra. Área de conteúdo usa fonte mono (`font-mono`) e preserva espaços (`whitespace-pre`), senão os acordes desalinham da sílaba.
