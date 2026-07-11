-- Extends import_song for the URL-import + dedupe flow (spec 002-importacao,
-- plan.md "import_song estendido para URL + dedupe (T4)"). Both new
-- parameters default to null so the existing Modo Avançado (paste) call
-- from 002-T2 keeps working unchanged.
--
-- existing_song_id null  -> same as before (INSERT song + INSERT tab),
--                            now also persisting source_url.
-- existing_song_id set   -> user chose "Sobrescrever" on the duplicate
--                            warning: UPDATE the song's metadata (band_id
--                            re-checked to prevent cross-tenant overwrite)
--                            and UPSERT the tab (same instrument replaces
--                            content; a different instrument adds a tab to
--                            the same song). Still one transaction.

-- CREATE OR REPLACE only replaces a function with the identical parameter
-- list; adding trailing parameters (even with defaults) creates a second
-- overload instead, leaving the old 6-arg signature reachable and making
-- any 6-arg call ambiguous ("function is not unique"). Drop it explicitly
-- first so only the new signature exists.
drop function if exists public.import_song(uuid, text, text, text, public.instrument, jsonb);

create function public.import_song(
  target_band uuid,
  song_title text,
  song_artist text,
  song_original_key text,
  tab_instrument public.instrument,
  tab_content jsonb,
  song_source_url text default null,
  existing_song_id uuid default null
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
           original_key = nullif(trim(coalesce(song_original_key, '')), '')
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
    insert into public.songs (band_id, title, artist, original_key, source_url)
    values (
      target_band,
      trim(song_title),
      nullif(trim(coalesce(song_artist, '')), ''),
      nullif(trim(coalesce(song_original_key, '')), ''),
      nullif(trim(coalesce(song_source_url, '')), '')
    )
    returning id into result_song_id;

    insert into public.song_tabs (song_id, instrument, content_type, content)
    values (result_song_id, tab_instrument, 'ast', tab_content);
  end if;

  return result_song_id;
end;
$$;

revoke execute on function public.import_song(uuid, text, text, text, public.instrument, jsonb, text, uuid) from anon;
