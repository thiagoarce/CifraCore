-- reorder_setlist RPC (spec 005-setlists-sync, plan.md "Setlists")
--
-- Persists a full reordering in one round trip: the client sends the
-- desired song_id order, the RPC assigns position = index atomically.
-- SECURITY INVOKER, but the admin check is explicit (raise exception)
-- rather than left to the UPDATE's RLS `using` clause silently matching
-- zero rows — a member calling this by mistake should see a clear error,
-- not a silent no-op that looks like success.

create or replace function public.reorder_setlist(target_setlist_id uuid, song_ids uuid[])
returns void
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  target_band uuid;
  sid uuid;
  idx int := 0;
begin
  select band_id into target_band from public.setlists where id = target_setlist_id;

  if target_band is null or not public.is_band_admin(target_band) then
    raise exception 'setlist not found in this band';
  end if;

  foreach sid in array song_ids loop
    update public.setlist_songs
    set position = idx
    where setlist_id = target_setlist_id and song_id = sid;
    idx := idx + 1;
  end loop;
end;
$$;

revoke execute on function public.reorder_setlist(uuid, uuid[]) from anon;
