-- setlists CRUD + reorder_setlist RPC tests for spec 005-setlists-sync T1
-- (run with: npx supabase test db)
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

-- Fixtures --------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000020', 'admin-d@test.dev'),
  ('00000000-0000-0000-0000-000000000021', 'member-d@test.dev');

insert into public.bands (id, name) values
  ('10000000-0000-0000-0000-00000000000d', 'Band D');

insert into public.band_members (user_id, band_id, role) values
  ('00000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-00000000000d', 'admin'),
  ('00000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-00000000000d', 'member');

insert into public.songs (id, band_id, title) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000d', 'Música 1'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000d', 'Música 2'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000d', 'Música 3');

-- As admin: create setlist, add songs, reorder ---------------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}', true);
end $$;

insert into public.setlists (id, band_id, name) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000d', 'Show de Sábado');

insert into public.setlist_songs (setlist_id, song_id, position) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 0),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 1),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 2);

select is(
  (select count(*)::int from public.setlist_songs where setlist_id = '30000000-0000-0000-0000-000000000001'),
  3,
  'admin added 3 songs to the setlist'
);

select lives_ok(
  $sql$
    select public.reorder_setlist(
      '30000000-0000-0000-0000-000000000001',
      array[
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002'
      ]::uuid[]
    )
  $sql$,
  'admin reorders the setlist via RPC'
);

select results_eq(
  $sql$
    select song_id from public.setlist_songs
    where setlist_id = '30000000-0000-0000-0000-000000000001'
    order by position
  $sql$,
  $sql$
    values
      ('20000000-0000-0000-0000-000000000003'::uuid),
      ('20000000-0000-0000-0000-000000000001'::uuid),
      ('20000000-0000-0000-0000-000000000002'::uuid)
  $sql$,
  'position column reflects the new order (survives a fresh select, i.e. a reload)'
);

reset role;

-- As member: read allowed, write blocked (RLS, not just hidden UI) -------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}', true);
end $$;

select is(
  (select count(*)::int from public.setlists where id = '30000000-0000-0000-0000-000000000001'),
  1,
  'member can read the setlist'
);

-- UPDATE/DELETE with a failing `using` clause don't raise (unlike INSERT's
-- `with check`) — the row is simply invisible for the write, so it matches
-- zero rows silently. Assert that directly instead of expecting an error.
select lives_ok(
  $sql$
    update public.setlists set name = 'Hackeado' where id = '30000000-0000-0000-0000-000000000001'
  $sql$,
  'member update matches zero rows instead of raising'
);

select is(
  (select name from public.setlists where id = '30000000-0000-0000-0000-000000000001'),
  'Show de Sábado',
  'the name was NOT changed by the member (RLS `using` filtered the row out)'
);

select throws_ok(
  $sql$
    insert into public.setlist_songs (setlist_id, song_id, position)
    values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 5)
  $sql$,
  '42501', null,
  'member cannot add a song to the setlist (RLS)'
);

select lives_ok(
  $sql$
    delete from public.setlist_songs
    where setlist_id = '30000000-0000-0000-0000-000000000001'
      and song_id = '20000000-0000-0000-0000-000000000001'
  $sql$,
  'member delete matches zero rows instead of raising'
);

select throws_ok(
  $sql$
    select public.reorder_setlist(
      '30000000-0000-0000-0000-000000000001',
      array['20000000-0000-0000-0000-000000000001']::uuid[]
    )
  $sql$,
  'P0001', 'setlist not found in this band',
  'member cannot reorder via the RPC either (explicit admin check, not a silent no-op)'
);

reset role;

select is(
  (select count(*)::int from public.setlist_songs where setlist_id = '30000000-0000-0000-0000-000000000001'),
  3,
  'none of the blocked member writes actually changed anything'
);

select * from finish();
rollback;
