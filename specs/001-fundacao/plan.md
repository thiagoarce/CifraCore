# Plan 001 — Fundação

## Decisões Técnicas

- **Migrações como fonte da verdade:** todo o schema nasce em `supabase/migrations/0001_initial_schema.sql` (+ `0002_rls_policies.sql`). O dashboard do Supabase é somente leitura.
- **Schema completo desde o início:** as tabelas de todas as features (inclusive `live_sessions`, `session_suggestions`) são criadas aqui. Features posteriores só _consomem_ o schema; se precisarem alterá-lo, nova migração + atualização deste plan.
- **Enums nativos do Postgres** para `role`, `instrument`, `content_type`, `status` (documentados no `PLAN.md` §3) — validação no banco, não só no client.
- **Cliente Supabase:** instância única em `$lib/supabase.ts`, tipada com tipos gerados (`supabase gen types typescript`). Tipos gerados vivem em `$lib/types/database.ts`.
- **Sessão/auth no SvelteKit:** hooks (`hooks.server.ts`) populam `locals.session`; rotas protegidas via layout guard em `src/routes/(app)/+layout.server.ts`.

## Padrão das Políticas RLS

Função helper SQL para não repetir subquery em toda política:

```sql
create or replace function public.is_band_member(target_band uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.band_members
    where band_id = target_band and user_id = auth.uid()
  );
$$;

create or replace function public.is_band_admin(target_band uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.band_members
    where band_id = target_band and user_id = auth.uid() and role = 'admin'
  );
$$;
```

Padrão por tabela (DDL final escrita na implementação, revisada por Fable):

| Tabela                                            | SELECT                    | INSERT/UPDATE/DELETE                                                                             |
| ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `bands`                                           | `is_band_member(id)`      | `is_band_admin(id)` (INSERT: qualquer autenticado; trigger cria o vínculo admin)                 |
| `band_members`                                    | `is_band_member(band_id)` | admin da banda; usuário pode deletar o próprio vínculo (sair da banda)                           |
| `songs`, `song_tabs`, `setlists`, `setlist_songs` | membro                    | admin                                                                                            |
| `live_sessions`                                   | membro                    | **member também** pode UPDATE (`leader_id`, `current_song_id`, `status`) — liderança democrática |
| `session_suggestions`                             | membro                    | member pode INSERT; autor ou líder pode UPDATE `status`                                          |

**Armadilhas conhecidas:**

- `band_members` referenciando a si mesma nas políticas → usar as funções `security definer` acima para evitar recursão infinita de RLS.
- Criação de banda é um fluxo de duas escritas (band + membership admin) → **decidido: RPC `create_band(band_name)` SECURITY DEFINER** (sem política de INSERT em `bands`/`band_members` — escrita só pelas RPCs).
- Convite por e-mail exige ler `auth.users` (inacessível ao client) → **RPC `invite_band_member(target_band, member_email)`** SECURITY DEFINER, restrita a admins.

**Decisões tomadas na implementação (T2/T3):**

- `song_tabs` separa `content` (jsonb, AST) de `content_url` (text, PDF) com CHECK de exclusividade; UNIQUE (`song_id`, `instrument`). Refletido no `PLAN.md` §3.
- Grants de tabela: `authenticated` tem CRUD (o RLS decide as linhas); **`anon` não tem grant nenhum** — convidado nunca toca tabela direto (spec 005, Edge Function).
- Testes de isolamento em `supabase/tests/001_rls_isolation.sql` (pgTAP, 14 asserts), executados com `npx supabase test db`.

## Estrutura de Arquivos

```
src/
├── hooks.server.ts               # client por request + safeGetSession + guard
├── app.d.ts                      # App.Locals tipado
├── lib/
│   ├── types/database.ts         # gerado (supabase gen types)
│   └── stores/currentBand.ts
└── routes/
    ├── +layout.server.ts / +layout.ts / +layout.svelte  # sessão SSR↔browser
    ├── (auth)/login, register, reset
    └── (app)/+layout.server.ts   # guard de segunda linha
supabase/
├── migrations/20260707000001_initial_schema.sql
├── migrations/20260707000002_rls_policies.sql
├── tests/001_rls_isolation.sql   # pgTAP (npx supabase test db)
└── config.toml
```

Nota (decisão T4): não há `$lib/supabase.ts` singleton — o padrão `@supabase/ssr` cria um client **por request** no servidor (`hooks.server.ts`) e um client de browser no `+layout.ts` raiz, exposto às páginas via `data.supabase`. Um singleton compartilharia cookies entre requests no servidor (bug de segurança clássico).

## Riscos Específicos

- RLS mal escrita = vazamento entre bandas (pior bug possível do produto). Por isso toda a camada SQL é tarefa `[FABLE]` e exige testes de isolamento automatizados (dois usuários simulados) antes de qualquer feature seguinte.
