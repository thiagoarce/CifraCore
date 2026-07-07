# Tasks 001 — Fundação

Ordem de execução de cima para baixo. Tags: `[FABLE]` = sensível, executar pelo agente principal; `[SONNET]` = delegável com este spec.

- [x] **T1 `[FABLE]` Scaffold do projeto** — SvelteKit + TS estrito + Tailwind + `@sveltejs/adapter-cloudflare` + Vitest. Configurar aliases (`$lib/...`), Prettier/ESLint.
      **DoD:** `npm run build` e `npm run test` passam; deploy de preview no Cloudflare Pages funciona.
      _Feito. `build`/`test`/`lint`/`check` passando. Pendência externa: conectar o repositório ao Cloudflare Pages (ação do dono do projeto no dashboard) para validar o deploy de preview._

- [x] **T2 `[FABLE]` Setup Supabase + migração de schema** — `supabase init`, escrever `0001_initial_schema.sql` com todas as tabelas e enums do `PLAN.md` §3.
      **DoD:** `supabase db reset` aplica limpo; tipos gerados em `$lib/types/database.ts`.
      _Feito. Migração `20260707000001_initial_schema.sql`; RLS ligada desde a criação; tipos gerados._

- [x] **T3 `[FABLE]` Políticas RLS + funções helper** — `0002_rls_policies.sql` com `is_band_member`/`is_band_admin` e políticas por tabela conforme plan; RPC `create_band(name)`.
      **DoD:** teste automatizado com dois usuários prova: membro lê só a própria banda; member não escreve em catálogo; member consegue UPDATE em `live_sessions`; criador de banda vira admin.
      _Feito. Migração `20260707000002_rls_policies.sql` + RPC extra `invite_band_member`; pgTAP 14/14 em `supabase/tests/001_rls_isolation.sql`._

- [x] **T4 `[FABLE]` Auth no SvelteKit** — cliente em `$lib/supabase.ts`, `hooks.server.ts` com sessão, guard de rotas `(app)`.
      **DoD:** rota protegida redireciona não autenticado para `/login`; sessão sobrevive a reload.
      _Feito. Padrão @supabase/ssr: client por request em `hooks.server.ts` + `safeGetSession` validando JWT; client do browser criado no `+layout.ts` raiz (não há `$lib/supabase.ts` — o client é por request/por load, decisão registrada no plan). Verificado com curl: 303 sem sessão, 200 com cookie de sessão._

- [ ] **T5 `[SONNET]` Telas de autenticação** — páginas login, cadastro, recuperação de senha em `(auth)/`, usando o design system básico (cores do spec 003 §Paletas; componentes simples, sem dashboard ainda).
      **DoD:** fluxo cadastro→login→logout funciona manualmente; erros de auth exibidos de forma amigável.

- [ ] **T6 `[SONNET]` CRUD de bandas e membros** — tela "Minhas Bandas", criar banda (via RPC `create_band`), convidar membro por e-mail, listar membros, sair da banda. Store `$currentBand` com persistência em localStorage.
      **DoD:** cenários Gherkin "Criador vira admin" e "Alternância de banda" passam manualmente; convite de e-mail para usuário existente vincula corretamente.

- [ ] **T7 `[SONNET]` Teste da store `$currentBand`** — teste unitário: seleção persiste, fallback para primeira banda, limpa no logout.
      **DoD:** testes passam no Vitest.
