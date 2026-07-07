# CLAUDE.md — Guia do Projeto CifraCore

## O que é

PWA multi-tenant para bandas: repertório com cifras/partituras multi-instrumento, transposição de tom, setlists e sincronia em tempo real no palco (líder democrático, offline-first). Stack: SvelteKit + TypeScript + Tailwind (Cloudflare Pages) e Supabase (Postgres/RLS, Realtime, Storage, Edge Functions).

## Mapa da Documentação (ler nesta ordem)

1. **`constitution.md`** — leis imutáveis. Lê-se antes de qualquer código. Não negociável.
2. **`PRD.md`** — o produto: funcionalidades, decisões e roadmap.
3. **`PLAN.md`** — arquitetura global: stack, schema, contratos de tipos/payloads, riscos, convenções de caminhos.
4. **`specs/NNN-feature/`** — por feature: `spec.md` (comportamento, Gherkin, critérios), `plan.md` (decisões técnicas locais), `tasks.md` (tarefas ordenadas com DoD).
5. **`TASKS.md`** — índice mestre: dependências entre features, estado, tabela de delegação.
6. **`specs/BACKLOG.md`** — pós-MVP. Não implementar sem criar spec antes.

## Workflow (Spec-Driven Development)

- Antes de codar em uma feature: ler `constitution.md`, `PLAN.md` e a pasta `specs/NNN-*` inteira.
- **Mudança de arquitetura/dependência/contrato → atualizar o plan/spec ANTES do código** (Lei 1).
- Tarefas na ordem do `tasks.md`; fechar tarefa = DoD cumprido + checkbox marcado.
- Lógica crítica (utils puros, parsers, stores de sync) exige teste escrito antes ou junto (Lei 2). UI Svelte não exige teste unitário.
- Ao concluir uma feature: atualizar a tabela de Estado no `TASKS.md`.

## Modelo de Delegação (importante)

Cada tarefa é marcada `[FABLE]` ou `[SONNET]` (tabela completa no `TASKS.md`):

- **`[FABLE]`** — sensível (segurança/RLS, concorrência e tempo real, parsing defensivo, infraestrutura). Executada apenas pelo agente principal (Fable). Um agente Sonnet que encontrar uma tarefa `[FABLE]` não implementa: sinaliza e para.
- **`[SONNET]`** — delegável: UI, CRUD, integrações com contrato fechado. Executar seguindo o spec **ao pé da letra**; se o spec for ambíguo ou faltar informação, **parar e perguntar** — nunca inventar comportamento (Lei 8).

## Convenções

- Docs em PT-BR; código, identificadores, tabelas, commits e testes em **inglês**.
- TypeScript estrito; tipos canônicos em `$lib/types/` (não criar variações locais).
- Caminhos: `$lib/components/ui|song|setlist|stage`, `$lib/stores`, `$lib/utils` (funções puras), `$lib/types`, `supabase/functions`, `supabase/migrations`.
- Schema só muda por migração versionada; dashboard do Supabase é somente leitura.
- Realtime só trafega eventos de estado — nunca scroll/posições (Lei 3). Timers que afetam o DOM usam `worker-timers` (Lei 5).
- Toda renderização de conteúdo musical degrada para texto puro em erro — a tela de palco nunca crasha (Lei 4).

## Comandos

O projeto ainda não foi inicializado (a tarefa 001-T1 cria o scaffold). Ao criá-lo, registrar aqui:

```bash
npm run dev        # dev server
npm run build      # build (adapter Cloudflare)
npm run test       # Vitest
supabase start     # stack local
supabase db reset  # aplica migrações do zero
```

## Estado Atual

Repositório em fase de especificação — nenhum código de app ainda. Próximo passo: `specs/001-fundacao/tasks.md` T1.
