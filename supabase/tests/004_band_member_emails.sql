-- get_band_member_emails RPC tests for spec 005-setlists-sync T2
-- (run with: npx supabase test db)
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(4);

-- Fixtures --------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000030', 'admin-e@test.dev'),
  ('00000000-0000-0000-0000-000000000031', 'member-e@test.dev');

insert into public.bands (id, name) values
  ('10000000-0000-0000-0000-00000000000e', 'Band E'),
  ('10000000-0000-0000-0000-00000000000f', 'Band F (outra banda)');

insert into public.band_members (user_id, band_id, role) values
  ('00000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-00000000000e', 'admin'),
  ('00000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-00000000000e', 'member');

-- As a member of the band: sees every member's email --------------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);
end $$;

select results_eq(
  $sql$
    select user_id, email from public.get_band_member_emails('10000000-0000-0000-0000-00000000000e')
    order by email
  $sql$,
  $sql$
    values
      ('00000000-0000-0000-0000-000000000030'::uuid, 'admin-e@test.dev'::text),
      ('00000000-0000-0000-0000-000000000031'::uuid, 'member-e@test.dev'::text)
  $sql$,
  'a member of the band sees every member''s email (used as display name)'
);

reset role;

-- As a member of a DIFFERENT band: rejected, not an empty/leaky result ---

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);
end $$;

select throws_ok(
  $sql$ select * from public.get_band_member_emails('10000000-0000-0000-0000-00000000000f') $sql$,
  'P0001', 'not a member of this band',
  'a member of Band E cannot read Band F''s roster emails'
);

reset role;

-- As an unauthenticated / non-member caller: rejected too ----------------

set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);
end $$;

select throws_ok(
  $sql$ select * from public.get_band_member_emails('10000000-0000-0000-0000-00000000000e') $sql$,
  'P0001', 'not a member of this band',
  'a user with no membership at all is rejected, not given an empty-but-successful result'
);

reset role;

select is(
  has_function_privilege('anon', 'public.get_band_member_emails(uuid)', 'execute'),
  false,
  'anon has no execute privilege on the RPC at all'
);

select * from finish();
rollback;
