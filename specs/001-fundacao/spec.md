# Spec 001 — Fundação: Projeto, Autenticação, Bandas e Schema

## Intenção

Estabelecer a base técnica do CifraCore: projeto SvelteKit configurado para Cloudflare Pages, Supabase inicializado, autenticação funcionando, e o schema multi-tenant completo com RLS. Ao final desta feature, um usuário consegue criar conta, criar/entrar numa banda e convidar membros — ainda sem catálogo visível.

## Requisitos

- **R1.** Projeto SvelteKit + TypeScript estrito + Tailwind, com `@sveltejs/adapter-cloudflare`, buildando e deployável.
- **R2.** Supabase configurado com migrações versionadas em `supabase/migrations/` (nunca schema criado manualmente pelo dashboard).
- **R3.** Autenticação por e-mail/senha (Supabase Auth), com fluxo de cadastro, login, logout e recuperação de senha.
- **R4.** Schema completo conforme `PLAN.md` §3 (todas as tabelas, mesmo as usadas por features posteriores — o schema nasce inteiro para evitar migrações conflitantes durante o desenvolvimento paralelo).
- **R5.** RLS ativa em todas as tabelas desde a primeira migração. Nenhuma tabela de tenant sem política.
- **R6.** Usuário pode criar banda (vira `admin` automaticamente) e convidar membros por e-mail.
- **R7.** Usuário membro de várias bandas pode alternar a banda ativa (`$currentBand`).

## Cenários de Comportamento (Gherkin)

### Funcionalidade: Isolamento Multi-Tenant

**Cenário: Membro não enxerga dados de outra banda**
- **Dado** que "Thiago" é membro da banda "Tarja Preta"
- **E** existe outra banda "Baião de Dois" da qual Thiago não é membro
- **Quando** Thiago consulta a tabela `songs` (por qualquer via, inclusive query direta na API do Supabase)
- **Então** o resultado contém apenas músicas com `band_id` da "Tarja Preta"
- **E** um SELECT explícito por id de música da "Baião de Dois" retorna vazio.

**Cenário: Member não escreve no catálogo**
- **Dado** que "Membro X" tem `role = 'member'` na banda "Tarja Preta"
- **Quando** ele tenta INSERT/UPDATE/DELETE em `songs`, `setlists` ou `bands`
- **Então** o banco rejeita a operação por política RLS.

### Funcionalidade: Criação de banda

**Cenário: Criador vira admin**
- **Dado** um usuário autenticado sem bandas
- **Quando** ele cria a banda "Tarja Preta"
- **Então** existe uma linha em `bands`
- **E** existe uma linha em `band_members` com seu `user_id`, o novo `band_id` e `role = 'admin'`.

### Funcionalidade: Alternância de banda

**Cenário: Músico em duas bandas**
- **Dado** que "Thiago" é membro de "Tarja Preta" e "Baião de Dois"
- **Quando** ele seleciona "Baião de Dois" no seletor de banda
- **Então** `$currentBand` muda e a escolha persiste em localStorage após reload.

## Critérios de Aceitação

- [ ] `npm run build` passa com adapter Cloudflare.
- [ ] Todas as tabelas do `PLAN.md` §3 existem via migração, com RLS habilitada.
- [ ] Testes de RLS (via service role de teste simulando dois usuários) provam o isolamento dos dois primeiros cenários.
- [ ] Fluxo completo: cadastro → login → criar banda → convidar membro → membro entra → membro lê, não escreve.

## Fora de Escopo

UI polida (spec 003), OAuth social (backlog), conteúdo de músicas (spec 002).
