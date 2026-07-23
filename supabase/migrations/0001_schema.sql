-- Dauphins du TOEC — schéma initial
-- Convention : tous les id métier sont des uuid, gen_random_uuid() (pgcrypto, activé par défaut sur Supabase)

create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES — un profil par utilisateur auth, porte le rôle
-- ============================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'athlete')),
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ATHLETES — extension 1:1 de profiles pour les athlètes
-- ============================================================
create table athletes (
  id uuid primary key references profiles (id) on delete cascade,
  sex text check (sex in ('M', 'F')),
  birth_date date,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 2),
  category text,
  phone text,
  address text,
  postal_code text,
  city text,
  profession text,
  work_activity_level smallint check (work_activity_level between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger athletes_set_updated_at
before update on athletes
for each row execute function set_updated_at();

-- ============================================================
-- ATHLETE TAGS — points forts / faibles / à travailler
-- ============================================================
create table athlete_tags (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes (id) on delete cascade,
  type text not null check (type in ('fort', 'faible', 'a_travailler')),
  label text not null,
  source text not null default 'coach' check (source in ('questionnaire', 'coach')),
  created_at timestamptz not null default now()
);

create index athlete_tags_athlete_id_idx on athlete_tags (athlete_id);

-- ============================================================
-- GROUPES
-- ============================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  created_at timestamptz not null default now()
);

create table athlete_groups (
  athlete_id uuid not null references athletes (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  primary key (athlete_id, group_id)
);

create index athlete_groups_group_id_idx on athlete_groups (group_id);

-- ============================================================
-- BIBLIOTHÈQUE D'EXERCICES
-- ============================================================
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('musculation', 'mobilite', 'filler', 'renfo', 'cardio')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PERFORMANCES — le record par athlète/exercice = MAX(value_kg), calculé à la volée
-- ============================================================
create table performances (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  value_kg numeric(6, 2) not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index performances_athlete_exercise_idx on performances (athlete_id, exercise_id);

-- vue pratique : record actuel par athlète/exercice
create view athlete_records as
select athlete_id, exercise_id, max(value_kg) as record_kg
from performances
group by athlete_id, exercise_id;

-- ============================================================
-- SÉANCES (et templates — même table, is_template = true)
-- ============================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date,
  group_id uuid references groups (id) on delete set null,
  duration_minutes int,
  warmup_text text,
  time_slot text check (time_slot in ('matin', 'apres_midi', 'soir')) default 'matin',
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);

create index sessions_date_idx on sessions (date);
create index sessions_group_id_idx on sessions (group_id);

create table session_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  title text not null default 'Bloc',
  order_index int not null default 0
);

create index session_blocks_session_id_idx on session_blocks (session_id);

create table session_exercises (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references session_blocks (id) on delete cascade,
  exercise_name text not null,
  exercise_id uuid references exercises (id) on delete set null,
  sets text,
  reps text,
  charge_rpe text,
  recovery text,
  order_index int not null default 0
);

create index session_exercises_block_id_idx on session_exercises (block_id);

-- ============================================================
-- COMPÉTITION AFFICHÉE DANS LE BANDEAU
-- ============================================================
create table next_competition (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- une seule compétition active à la fois
create unique index next_competition_one_active_idx on next_competition (is_active) where is_active;

-- ============================================================
-- QUESTIONNAIRE D'ENTRÉE ATHLÈTE
-- ============================================================
create table questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null unique references athletes (id) on delete cascade,
  general jsonb not null default '{}',
  sport jsonb not null default '{}',
  medical jsonb not null default '{}',
  measurements jsonb not null default '{}',
  nutrition jsonb not null default '{}',
  other_remarks text,
  submitted_at timestamptz not null default now()
);
