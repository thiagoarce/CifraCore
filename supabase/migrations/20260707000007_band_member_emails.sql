-- get_band_member_emails RPC (spec 005-setlists-sync, plan.md "Ciclo de vida
-- da sessão + liderança")
--
-- The schema has no display-name concept anywhere (no profiles table, no
-- name column) — only auth.users.email, which clients can't read directly
-- (RLS never exposes auth.users). LiveEvent's LEADER_CHANGE/SUGGESTION
-- carry a human-readable name, so this SECURITY DEFINER RPC maps
-- user_id -> email for the members of a band the caller belongs to, and
-- the UI displays the email as the "name" (no separate display name yet).
create or replace function public.get_band_member_emails(target_band uuid)
returns table (user_id uuid, email text)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_band_member(target_band) then
    raise exception 'not a member of this band';
  end if;

  return query
  select bm.user_id, u.email::text
  from public.band_members bm
  join auth.users u on u.id = bm.user_id
  where bm.band_id = target_band;
end;
$$;

-- Unlike this migration's siblings (which only `revoke ... from anon`,
-- leaving the implicit PUBLIC execute grant every function gets at
-- creation still in place for anon), this one is revoked from PUBLIC
-- outright and re-granted to authenticated only — real least privilege,
-- not just relying on the internal is_band_member() check as the sole
-- defense. Found while writing this function's own pgTAP test.
revoke execute on function public.get_band_member_emails(uuid) from public;
grant execute on function public.get_band_member_emails(uuid) to authenticated;
