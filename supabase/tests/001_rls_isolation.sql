-- RLS isolation tests for spec 001-fundacao (run with: npx supabase test db)
-- Simulates three users by setting request.jwt.claims + role authenticated:
--   user 1: admin of Band A
--   user 2: member of Band A
--   user 3: admin of Band B (outsider to Band A)
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;

select plan(14);

-- Fixtures (as postgres: bypasses RLS) ----------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin-a@test.dev'),
  ('00000000-0000-0000-0000-000000000002', 'member-a@test.dev'),
  ('00000000-0000-0000-0000-000000000003', 'admin-b@test.dev');

insert into public.bands (id, name) values
  ('10000000-0000-0000-0000-00000000000a', 'Band A'),
  ('10000000-0000-0000-0000-00000000000b', 'Band B');

insert into public.band_members (user_id, band_id, role) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', 'member'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000b', 'admin');

insert into public.songs (id, band_id, title) values
  ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'Song A1'),
  ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'Song B1');

-- Schema sanity: RLS on in every public table ---------------------------

select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has RLS enabled'
);

-- As user 2 (member of Band A) -------------------------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
end $$;

select results_eq(
  'select title from public.songs order by title',
  array['Song A1'::text],
  'member reads only own band songs'
);

select is_empty(
  'select * from public.songs where id = ''20000000-0000-0000-0000-0000000000b1''',
  'explicit select of another band''s song returns nothing'
);

select throws_ok(
  'insert into public.songs (band_id, title) values (''10000000-0000-0000-0000-00000000000a'', ''Hack'')',
  '42501', null,
  'member cannot insert songs (admin-only write)'
);

-- silent-zero updates: run them, verify below as postgres
update public.bands set name = 'Hacked A' where id = '10000000-0000-0000-0000-00000000000a';
update public.bands set name = 'Hacked B' where id = '10000000-0000-0000-0000-00000000000b';

reset role;

select is(
  (select count(*)::int from public.bands where name like 'Hacked%'),
  0,
  'member updates on bands (own or foreign) affect zero rows'
);

-- As user 3 (no relation to Band A) ---------------------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
end $$;

select is_empty(
  'select * from public.songs where band_id = ''10000000-0000-0000-0000-00000000000a''',
  'outsider sees no songs of Band A'
);

select is_empty(
  'select * from public.band_members where band_id = ''10000000-0000-0000-0000-00000000000a''',
  'outsider sees no roster of Band A'
);

reset role;

-- Democratic live session: member starts, member takes leadership ---------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
end $$;

insert into public.live_sessions (id, band_id, leader_id)
values ('30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-000000000001');

reset role;

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
end $$;

update public.live_sessions
   set leader_id = '00000000-0000-0000-0000-000000000002'
 where id = '30000000-0000-0000-0000-000000000001';

reset role;

select is(
  (select leader_id from public.live_sessions
    where id = '30000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-000000000002'::uuid,
  'plain member can take over live session leadership'
);

-- create_band RPC: creator becomes admin ----------------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
end $$;

select lives_ok(
  'select public.create_band(''Nova Banda'')',
  'authenticated user can create a band via RPC'
);

reset role;

select is(
  (select count(*)::int from public.bands where name = 'Nova Banda'),
  1,
  'create_band inserts the band'
);

select is(
  (select count(*)::int
     from public.band_members bm
     join public.bands b on b.id = bm.band_id
    where b.name = 'Nova Banda'
      and bm.user_id = '00000000-0000-0000-0000-000000000003'
      and bm.role = 'admin'),
  1,
  'create_band makes the creator an admin'
);

-- invite_band_member RPC ---------------------------------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
end $$;

select throws_ok(
  'select public.invite_band_member(''10000000-0000-0000-0000-00000000000a'', ''admin-b@test.dev'')',
  'P0001', 'only band admins can invite members',
  'plain member cannot invite'
);

reset role;

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
end $$;

select lives_ok(
  'select public.invite_band_member(''10000000-0000-0000-0000-00000000000a'', ''admin-b@test.dev'')',
  'band admin invites an existing user by e-mail'
);

reset role;

select is(
  (select count(*)::int from public.band_members
    where band_id = '10000000-0000-0000-0000-00000000000a'
      and user_id = '00000000-0000-0000-0000-000000000003'
      and role = 'member'),
  1,
  'invited user joined as plain member'
);

select * from finish();
rollback;
