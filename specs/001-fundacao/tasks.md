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
      _Bug encontrado em produção (testado só localmente antes, onde `enable_confirmations = false` — o fluxo de confirmação por e-mail nunca tinha sido exercido): a rota raiz `/` não era coberta pelo guard (só `(app)`/`(auth)`), mostrando a página padrão do scaffold do SvelteKit; e o guard redirecionava `/` no servidor incondicionalmente, o que descarta o link de confirmação por e-mail da Supabase (que redireciona para `{site_url}#access_token=...` — fragmento de URL, nunca chega ao servidor). Corrigido: o hook só redireciona `/` no servidor quando **já** há sessão (atalho para quem tem `/` nos favoritos); sem sessão, a própria `/+page.svelte` renderiza e faz `getSession()` no client (que aguarda a inicialização do client, responsável por processar o fragmento) antes de decidir `/dashboard` ou `/login` — determinístico, não depende do fragmento sobreviver a um redirect do servidor. Também corrigido: `site_url`/`uri_allow_list` do projeto hospedado apontavam para `localhost:3000` (default do Supabase, nunca ajustado) — corrigido via Management API para o domínio de produção._

- [x] **T5 `[SONNET]` Telas de autenticação** — páginas login, cadastro, recuperação de senha em `(auth)/`, usando o design system básico (cores do spec 003 §Paletas; componentes simples, sem dashboard ainda).
      **DoD:** fluxo cadastro→login→logout funciona manualmente; erros de auth exibidos de forma amigável.
      _Feito por agente Sonnet, revisado por Fable. Erros mapeados para PT-BR em `(auth)/shared.ts`._
      _Bug encontrado em produção: `login`/`register` não tinham `finally`/reset de `loading` em volta de `invalidate()`+`goto()` — se essa chamada lançasse (rede instável, navegação interrompida), o botão ficava preso em "Entrando.../Criando conta..." para sempre, sem nenhuma mensagem. Corrigido com `try/catch/finally` garantindo que `loading` sempre volta a `false` e um erro genérico aparece se algo inesperado falhar._
      _Bug mais profundo, encontrado depois (QA visual da 003 com Playwright contra o stack local): mesmo com o `try/finally`, o login continuava não navegando — travado em `/login` mesmo após autenticar com sucesso. Instrumentado com `console.log` em cada etapa: `signInWithPassword` resolve OK, `invalidate('supabase:auth')` resolve OK, `goto('/dashboard')` resolve **sem erro** — mas a URL nunca muda. Investigando a rede: `GET /dashboard/__data.json` respondia **200** (sessão reconhecida, cookies OK), então não era problema de RLS/cookie/timing como se suspeitava a princípio — é uma race real entre o `invalidate()` (que re-executa o load da página atual, `/login`) e o `goto()` subsequente (que navega pra `/dashboard`): os dois disputam o "commit" da navegação e o re-render do `/login` vence. Corrigido migrando `login` e `register` de chamada client-side (`data.supabase.auth.X()` + `goto()`) para **form actions** (`+page.server.ts` com `actions.default`, usando o `locals.supabase` por-request já existente + `redirect(303, ...)` nativo do SvelteKit) com `use:enhance` no client — um único ciclo de request/response, sem `invalidate`/`goto` manuais, sem corrida possível. `reset/+page.svelte` não foi alterado (não navega após o submit, não tem a race). Casualmente, a skill `ui-ux-pro-max` (adicionada durante a 003) já recomendava exatamente isso pra Svelte ("Use form actions — Server-side form handling... Don't: API routes for forms")._

- [x] **T6 `[SONNET]` CRUD de bandas e membros** — tela "Minhas Bandas", criar banda (via RPC `create_band`), convidar membro por e-mail, listar membros, sair da banda. Store `$currentBand` com persistência em localStorage.
      **DoD:** cenários Gherkin "Criador vira admin" e "Alternância de banda" passam manualmente; convite de e-mail para usuário existente vincula corretamente.
      _Feito por agente Sonnet, revisado por Fable. Rotas `(app)/bands` e `(app)/bands/[id]`; layout `(app)` recarrega a lista via `depends('app:bands')`._

- [x] **T7 `[SONNET]` Teste da store `$currentBand`** — teste unitário: seleção persiste, fallback para primeira banda, limpa no logout.
      **DoD:** testes passam no Vitest.
      _Feito. 5 testes em `src/lib/stores/currentBand.spec.ts`._

## Pendências identificadas (follow-up, decidir antes de implementar — Lei 1)

- [ ] **T8 `[FABLE]` Callback de redefinição de senha** — a tela `/reset` dispara o e-mail (`resetPasswordForEmail`), mas falta a rota de retorno (troca de código PKCE + formulário de nova senha). Requer definir a rota (`/reset/confirm`) e o `redirectTo` no plan antes de codar.
- [ ] **T9 (a especificar) Nomes de exibição de membros** — a lista de membros mostra UUID para os demais usuários (e-mails de `auth.users` não são expostos ao client, correto por segurança). Precisa de tabela `profiles` (id FK auth.users, display_name) populada no cadastro + RLS. Mudança de schema → especificar no plan da 001 ou da 003 antes de implementar.
