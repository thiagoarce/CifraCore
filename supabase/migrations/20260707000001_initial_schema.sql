-- CifraCore initial schema (spec 001-fundacao, PLAN.md §3)
-- All band data is tenant-isolated by band_id. RLS policies live in the
-- next migration; every table here is created with RLS enabled so no
-- window exists where data is exposed.

-- Enums ---------------------------------------------------------------

create type public.band_role as enum ('admin', 'member');

create type public.instrument as enum ('vocal', 'guitar', 'bass', 'drums', 'keys', 'cifra');

create type public.tab_content_type as enum ('ast', 'pdf_url');

create type public.session_status as enum ('idle', 'playing', 'paused');

create type public.suggestion_status as enum ('pending', 'accepted', 'dismissed');

-- Core tables ---------------------------------------------------------

create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.band_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  band_id uuid not null references public.bands (id) on delete cascade,
  role public.band_role not null default 'member',
  instrument public.instrument,
  created_at timestamptz not null default now(),
  unique (user_id, band_id)
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  title text not null,
  artist text,
  original_key text,
  preferred_key text,
  capo int not null default 0 check (capo >= 0 and capo <= 12),
  bpm int check (bpm is null or (bpm > 0 and bpm < 400)),
  source_url text,
  created_at timestamptz not null default now()
);

create table public.song_tabs (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  instrument public.instrument not null,
  content_type public.tab_content_type not null,
  content jsonb,
  content_url text,
  created_at timestamptz not null default now(),
  -- exactly one payload shape per content_type
  check (
    (content_type = 'ast' and content is not null and content_url is null)
    or (content_type = 'pdf_url' and content_url is not null and content is null)
  ),
  unique (song_id, instrument)
);

-- Stage tables (realtime) ----------------------------------------------

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands (id) on delete cascade,
  name text not null,
  event_date date,
  created_at timestamptz not null default now()
);

create table public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position int not null,
  created_at timestamptz not null default now(),
  unique (setlist_id, song_id)
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null unique references public.bands (id) on delete cascade,
  setlist_id uuid references public.setlists (id) on delete set null,
  leader_id uuid not null references auth.users (id),
  current_song_id uuid references public.songs (id) on delete set null,
  status public.session_status not null default 'idle',
  created_at timestamptz not null default now()
);

create table public.session_suggestions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  suggested_by uuid not null references auth.users (id) on delete cascade,
  status public.suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Indexes for the tenant-scoped access paths ---------------------------

create index band_members_user_idx on public.band_members (user_id);
create index band_members_band_idx on public.band_members (band_id);
create index songs_band_idx on public.songs (band_id);
create index song_tabs_song_idx on public.song_tabs (song_id);
create index setlists_band_idx on public.setlists (band_id);
create index setlist_songs_setlist_idx on public.setlist_songs (setlist_id, position);
create index session_suggestions_session_idx on public.session_suggestions (session_id, status);

-- RLS on from birth (policies in the next migration; until then these
-- tables deny everything to anon/authenticated, which is the safe default).

alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_tabs enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;
alter table public.live_sessions enable row level security;
alter table public.session_suggestions enable row level security;
