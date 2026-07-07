# CifraCore

PWA multi-tenant para bandas: repertório com cifras/partituras multi-instrumento, transposição de tom, setlists e sincronia em tempo real no palco.

Stack: SvelteKit + TypeScript + Tailwind (Cloudflare Pages) e Supabase (Postgres/RLS, Realtime, Storage, Edge Functions).

## Documentação

O projeto segue Spec-Driven Development. Ordem de leitura:

1. [`constitution.md`](constitution.md) — leis imutáveis
2. [`PRD.md`](PRD.md) — produto e roadmap
3. [`PLAN.md`](PLAN.md) — arquitetura global
4. [`specs/`](specs/) — specs por feature (spec + plan + tasks)
5. [`TASKS.md`](TASKS.md) — índice mestre e delegação

## Desenvolvimento

```bash
npm install
npm run dev        # dev server
npm run build      # build (adapter Cloudflare)
npm run test       # Vitest
npm run lint       # Prettier + ESLint
npm run check      # svelte-check
```
