-- Extends import_song so the song-edit screen (spec 003-catalogo-ui T4) can
-- update preferred_key/capo/bpm atomically along with
-- title/artist/original_key/blocks, reusing the same RPC the dedupe/
-- overwrite flow (002-T4) already uses for "update existing_song_id" — no
-- separate edit-only RPC needed.
--
-- All three new params default to null. On the existing_song_id branch
-- (edit) they're set directly (not coalesced with the current value): the
-- edit form always submits the full current state of these fields, so null
-- only ever means the admin explicitly cleared it, never "leave alone". On
-- the fresh-insert branch (import, which doesn't collect any of these),
-- null falls back to the column defaults (capo 0, bpm/preferred_key unset).

drop function if exists public.import_song(uuid, text, text, text, public.instrument, jsonb, text, uuid);

create function public.import_song(
  target_band uuid,
  song_title text,
  song_artist text,
  song_original_key text,
  tab_instrument public.instrument,
  tab_content jsonb,
  song_source_url text default null,
  existing_song_id uuid default null,
  song_capo int default null,
  song_bpm int default null,
  song_preferred_key text default null
)
returns uuid
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  result_song_id uuid;
begin
  if song_title is null or length(trim(song_title)) = 0 then
    raise exception 'song title is required';
  end if;

  if tab_content is null or jsonb_typeof(tab_content) <> 'array' or jsonb_array_length(tab_content) = 0 then
    raise exception 'tab content must be a non-empty array of AST blocks';
  end if;

  if existing_song_id is not null then
    update public.songs
       set title = trim(song_title),
           artist = nullif(trim(coalesce(song_artist, '')), ''),
           original_key = nullif(trim(coalesce(song_original_key, '')), ''),
           preferred_key = nullif(trim(coalesce(song_preferred_key, '')), ''),
           capo = coalesce(song_capo, 0),
           bpm = song_bpm
     where id = existing_song_id and band_id = target_band
     returning id into result_song_id;

    if result_song_id is null then
      raise exception 'song not found in this band';
    end if;

    insert into public.song_tabs (song_id, instrument, content_type, content)
    values (result_song_id, tab_instrument, 'ast', tab_content)
    on conflict (song_id, instrument)
    do update set content_type = excluded.content_type, content = excluded.content;
  else
    insert into public.songs (band_id, title, artist, original_key, source_url, capo, bpm)
    values (
      target_band,
      trim(song_title),
      nullif(trim(coalesce(song_artist, '')), ''),
      nullif(trim(coalesce(song_original_key, '')), ''),
      nullif(trim(coalesce(song_source_url, '')), ''),
      coalesce(song_capo, 0),
      song_bpm
    )
    returning id into result_song_id;

    insert into public.song_tabs (song_id, instrument, content_type, content)
    values (result_song_id, tab_instrument, 'ast', tab_content);
  end if;

  return result_song_id;
end;
$$;

revoke execute on function public.import_song(
  uuid, text, text, text, public.instrument, jsonb, text, uuid, int, int, text
) from anon;
