-- import_song RPC tests for spec 002-importacao (run with: npx supabase test db)
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

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

-- URL import with source_url, then dedupe/overwrite (spec 002 R6) --------

select lives_ok(
  $sql$
    select public.import_song(
      '10000000-0000-0000-0000-00000000000c',
      'Faroeste Caboclo',
      'Legião Urbana',
      'D',
      'cifra',
      '[{"id":"33333333-3333-3333-3333-333333333333","type":"verse","label":"Parte 1","content":"v1","repeats":1}]'::jsonb,
      'https://www.cifraclub.com.br/legiao-urbana/faroeste-caboclo/'
    )
  $sql$,
  'import via URL persists source_url'
);

select is(
  (select source_url from public.songs where title = 'Faroeste Caboclo'),
  'https://www.cifraclub.com.br/legiao-urbana/faroeste-caboclo/',
  'source_url was stored for dedupe lookups'
);

select lives_ok(
  format(
    $sql$
      select public.import_song(
        '10000000-0000-0000-0000-00000000000c',
        'Faroeste Caboclo (revisado)',
        'Legião Urbana', 'D', 'cifra',
        '[{"id":"44444444-4444-4444-4444-444444444444","type":"verse","label":"Parte 1","content":"v2 atualizado","repeats":1}]'::jsonb,
        'https://www.cifraclub.com.br/legiao-urbana/faroeste-caboclo/',
        %L
      )
    $sql$,
    (select id from public.songs where title = 'Faroeste Caboclo')
  ),
  'overwriting an existing import (existing_song_id set) updates in place'
);

select is(
  (select count(*)::int from public.songs where source_url = 'https://www.cifraclub.com.br/legiao-urbana/faroeste-caboclo/'),
  1,
  'overwrite did not create a second song for the same source_url'
);

select is(
  (select st.content->0->>'content' from public.song_tabs st
     join public.songs s on s.id = st.song_id
    where s.source_url = 'https://www.cifraclub.com.br/legiao-urbana/faroeste-caboclo/'),
  'v2 atualizado',
  'overwrite replaced the tab content (upsert on song_id+instrument)'
);

reset role;

select * from finish();
rollback;
