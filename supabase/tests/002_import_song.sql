-- import_song RPC tests for spec 002-importacao (run with: npx supabase test db)
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

-- Fixtures --------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000010', 'admin-c@test.dev'),
  ('00000000-0000-0000-0000-000000000011', 'member-c@test.dev');

insert into public.bands (id, name) values
  ('10000000-0000-0000-0000-00000000000c', 'Band C');

insert into public.band_members (user_id, band_id, role) values
  ('00000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-00000000000c', 'admin'),
  ('00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-00000000000c', 'member');

-- As admin: successful import is a single transaction --------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
end $$;

select lives_ok(
  $sql$
    select public.import_song(
      '10000000-0000-0000-0000-00000000000c',
      'Tempo Perdido',
      'Legião Urbana',
      'C',
      'cifra',
      '[{"id":"11111111-1111-1111-1111-111111111111","type":"verse","label":"Parte 1","content":"la la la","repeats":1}]'::jsonb
    )
  $sql$,
  'admin imports a song successfully'
);

reset role;

select is(
  (select count(*)::int from public.songs where title = 'Tempo Perdido' and band_id = '10000000-0000-0000-0000-00000000000c'),
  1,
  'import_song inserted exactly one song'
);

select is(
  (select count(*)::int from public.song_tabs st
     join public.songs s on s.id = st.song_id
    where s.title = 'Tempo Perdido' and st.instrument = 'cifra' and st.content_type = 'ast'),
  1,
  'import_song inserted exactly one matching tab'
);

-- As member: RLS still applies inside the RPC (security invoker) --------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}', true);
end $$;

select throws_ok(
  $sql$
    select public.import_song(
      '10000000-0000-0000-0000-00000000000c',
      'Hack Song',
      null, null, 'cifra',
      '[{"id":"22222222-2222-2222-2222-222222222222","type":"verse","label":"Parte 1","content":"x","repeats":1}]'::jsonb
    )
  $sql$,
  '42501', null,
  'plain member cannot import (RLS on songs blocks the insert)'
);

reset role;

-- Validation guards -------------------------------------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
end $$;

select throws_ok(
  $sql$ select public.import_song('10000000-0000-0000-0000-00000000000c', '', null, null, 'cifra', '[{"id":"1","type":"verse","label":"x","content":"x","repeats":1}]'::jsonb) $sql$,
  'P0001', 'song title is required',
  'empty title is rejected before any insert'
);

select throws_ok(
  $sql$ select public.import_song('10000000-0000-0000-0000-00000000000c', 'No Blocks', null, null, 'cifra', '[]'::jsonb) $sql$,
  'P0001', 'tab content must be a non-empty array of AST blocks',
  'empty AST array is rejected before any insert'
);

reset role;

select * from finish();
rollback;
