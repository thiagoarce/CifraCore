-- CifraCore RLS policies and helper functions (spec 001-fundacao)
--
-- Tenancy model: a user only sees rows of bands they belong to
-- (band_members). Catalog/setlist/band writes are admin-only. Democratic
-- exceptions: any member can run the live session (start, update, end)
-- and file suggestions. Band creation and member invites go through
-- SECURITY DEFINER RPCs so no direct INSERT policy exists on bands.

-- Table privileges -------------------------------------------------------
-- RLS narrows rows, but table-level grants come first. authenticated gets
-- CRUD (RLS decides what actually passes); anon gets NOTHING on purpose:
-- guest access never touches tables directly (Edge Function only, spec 005).

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

-- Helper functions ------------------------------------------------------
-- SECURITY DEFINER so policies on band_members itself don't recurse.

create or replace function public.is_band_member(target_band uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.band_members
    where band_id = target_band and user_id = auth.uid()
  );
$$;

create or replace function public.is_band_admin(target_band uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.band_members
    where band_id = target_band and user_id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_band_member(uuid) from anon;
revoke execute on function public.is_band_admin(uuid) from anon;

-- bands -----------------------------------------------------------------
-- No INSERT policy: creation only via create_band() RPC.

create policy "members read their bands"
  on public.bands for select
  to authenticated
  using (public.is_band_member(id));

create policy "admins update their bands"
  on public.bands for update
  to authenticated
  using (public.is_band_admin(id))
  with check (public.is_band_admin(id));

create policy "admins delete their bands"
  on public.bands for delete
  to authenticated
  using (public.is_band_admin(id));

-- band_members ----------------------------------------------------------
-- INSERT only via invite_band_member()/create_band() RPCs (no policy).

create policy "members read band roster"
  on public.band_members for select
  to authenticated
  using (public.is_band_member(band_id));

create policy "admins update roster"
  on public.band_members for update
  to authenticated
  using (public.is_band_admin(band_id))
  with check (public.is_band_admin(band_id));

create policy "admins remove members or member leaves"
  on public.band_members for delete
  to authenticated
  using (public.is_band_admin(band_id) or user_id = auth.uid());

-- songs -----------------------------------------------------------------

create policy "members read songs"
  on public.songs for select
  to authenticated
  using (public.is_band_member(band_id));

create policy "admins write songs"
  on public.songs for insert
  to authenticated
  with check (public.is_band_admin(band_id));

create policy "admins update songs"
  on public.songs for update
  to authenticated
  using (public.is_band_admin(band_id))
  with check (public.is_band_admin(band_id));

create policy "admins delete songs"
  on public.songs for delete
  to authenticated
  using (public.is_band_admin(band_id));

-- song_tabs (tenant scope derived through songs) --------------------------

create policy "members read tabs"
  on public.song_tabs for select
  to authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_band_member(s.band_id)
  ));

create policy "admins insert tabs"
  on public.song_tabs for insert
  to authenticated
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_band_admin(s.band_id)
  ));

create policy "admins update tabs"
  on public.song_tabs for update
  to authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_band_admin(s.band_id)
  ))
  with check (exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_band_admin(s.band_id)
  ));

create policy "admins delete tabs"
  on public.song_tabs for delete
  to authenticated
  using (exists (
    select 1 from public.songs s
    where s.id = song_id and public.is_band_admin(s.band_id)
  ));

-- setlists ----------------------------------------------------------------

create policy "members read setlists"
  on public.setlists for select
  to authenticated
  using (public.is_band_member(band_id));

create policy "admins insert setlists"
  on public.setlists for insert
  to authenticated
  with check (public.is_band_admin(band_id));

create policy "admins update setlists"
  on public.setlists for update
  to authenticated
  using (public.is_band_admin(band_id))
  with check (public.is_band_admin(band_id));

create policy "admins delete setlists"
  on public.setlists for delete
  to authenticated
  using (public.is_band_admin(band_id));

-- setlist_songs (tenant scope derived through setlists) --------------------

create policy "members read setlist songs"
  on public.setlist_songs for select
  to authenticated
  using (exists (
    select 1 from public.setlists l
    where l.id = setlist_id and public.is_band_member(l.band_id)
  ));

create policy "admins insert setlist songs"
  on public.setlist_songs for insert
  to authenticated
  with check (exists (
    select 1 from public.setlists l
    where l.id = setlist_id and public.is_band_admin(l.band_id)
  ));

create policy "admins update setlist songs"
  on public.setlist_songs for update
  to authenticated
  using (exists (
    select 1 from public.setlists l
    where l.id = setlist_id and public.is_band_admin(l.band_id)
  ))
  with check (exists (
    select 1 from public.setlists l
    where l.id = setlist_id and public.is_band_admin(l.band_id)
  ));

create policy "admins delete setlist songs"
  on public.setlist_songs for delete
  to authenticated
  using (exists (
    select 1 from public.setlists l
    where l.id = setlist_id and public.is_band_admin(l.band_id)
  ));

-- live_sessions (democratic: any member operates the session) -------------

create policy "members read live session"
  on public.live_sessions for select
  to authenticated
  using (public.is_band_member(band_id));

create policy "members start live session"
  on public.live_sessions for insert
  to authenticated
  with check (public.is_band_member(band_id) and leader_id = auth.uid());

create policy "members update live session"
  on public.live_sessions for update
  to authenticated
  using (public.is_band_member(band_id))
  with check (public.is_band_member(band_id));

create policy "members end live session"
  on public.live_sessions for delete
  to authenticated
  using (public.is_band_member(band_id));

-- session_suggestions ------------------------------------------------------

create policy "members read suggestions"
  on public.session_suggestions for select
  to authenticated
  using (exists (
    select 1 from public.live_sessions ls
    where ls.id = session_id and public.is_band_member(ls.band_id)
  ));

create policy "members insert suggestions"
  on public.session_suggestions for insert
  to authenticated
  with check (
    suggested_by = auth.uid()
    and exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id and public.is_band_member(ls.band_id)
    )
  );

create policy "author or leader updates suggestion"
  on public.session_suggestions for update
  to authenticated
  using (
    suggested_by = auth.uid()
    or exists (
      select 1 from public.live_sessions ls
      where ls.id = session_id and ls.leader_id = auth.uid()
    )
  )
  with check (exists (
    select 1 from public.live_sessions ls
    where ls.id = session_id and public.is_band_member(ls.band_id)
  ));

-- RPCs -----------------------------------------------------------------

-- Band creation is a two-write transaction (band + admin membership);
-- SECURITY DEFINER keeps it atomic and lets us omit INSERT policies.
create or replace function public.create_band(band_name text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  new_band_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if band_name is null or length(trim(band_name)) = 0 then
    raise exception 'band name is required';
  end if;

  insert into public.bands (name) values (trim(band_name))
  returning id into new_band_id;

  insert into public.band_members (user_id, band_id, role)
  values (auth.uid(), new_band_id, 'admin');

  return new_band_id;
end;
$$;

-- Invite an existing user by e-mail. Looks up auth.users (not readable
-- from the client), so it must be SECURITY DEFINER; caller must be admin.
create or replace function public.invite_band_member(target_band uuid, member_email text)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  target_user uuid;
  membership_id uuid;
begin
  if not public.is_band_admin(target_band) then
    raise exception 'only band admins can invite members';
  end if;

  select id into target_user
  from auth.users
  where lower(email) = lower(trim(member_email));

  if target_user is null then
    raise exception 'no user found with this e-mail';
  end if;

  insert into public.band_members (user_id, band_id, role)
  values (target_user, target_band, 'member')
  on conflict (user_id, band_id) do nothing
  returning id into membership_id;

  if membership_id is null then
    raise exception 'user is already a member of this band';
  end if;

  return membership_id;
end;
$$;

revoke execute on function public.create_band(text) from anon;
revoke execute on function public.invite_band_member(uuid, text) from anon;
