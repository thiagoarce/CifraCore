-- import_song RPC (spec 002-importacao, plan.md "RPC import_song")
--
-- Wraps the two writes of the HITL "Aprovar e Gravar" step (INSERT songs +
-- INSERT song_tabs) in a single Postgres transaction, so a failure on the
-- second insert can never leave a song without its tab. SECURITY INVOKER
-- (the default, made explicit): runs with the caller's own privileges, so
-- the existing admin-only RLS policies on songs/song_tabs apply exactly as
-- if the client had issued the two inserts directly.

create or replace function public.import_song(
  target_band uuid,
  song_title text,
  song_artist text,
  song_original_key text,
  tab_instrument public.instrument,
  tab_content jsonb
)
returns uuid
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  new_song_id uuid;
begin
  if song_title is null or length(trim(song_title)) = 0 then
    raise exception 'song title is required';
  end if;

  if tab_content is null or jsonb_typeof(tab_content) <> 'array' or jsonb_array_length(tab_content) = 0 then
    raise exception 'tab content must be a non-empty array of AST blocks';
  end if;

  insert into public.songs (band_id, title, artist, original_key)
  values (
    target_band,
    trim(song_title),
    nullif(trim(coalesce(song_artist, '')), ''),
    nullif(trim(coalesce(song_original_key, '')), '')
  )
  returning id into new_song_id;

  insert into public.song_tabs (song_id, instrument, content_type, content)
  values (new_song_id, tab_instrument, 'ast', tab_content);

  return new_song_id;
end;
$$;

revoke execute on function public.import_song(uuid, text, text, text, public.instrument, jsonb) from anon;
