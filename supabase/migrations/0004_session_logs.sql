-- Dauphins du TOEC — journal de séance athlète
-- Permet de logger le détail série par série (charge + reps) d'un exercice réalisé
-- pendant une séance assignée, et un commentaire global de l'athlète sur la séance.

alter table performances
  add column session_id uuid references sessions (id) on delete set null,
  add column set_number smallint,
  add column reps smallint;

create index performances_session_id_idx on performances (session_id);

create table session_athlete_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  athlete_id uuid not null references athletes (id) on delete cascade,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, athlete_id)
);

create trigger session_athlete_notes_set_updated_at
before update on session_athlete_notes
for each row execute function set_updated_at();

alter table session_athlete_notes enable row level security;

create policy "session_athlete_notes_select" on session_athlete_notes
  for select using (is_coach() or athlete_id = auth.uid());

create policy "session_athlete_notes_athlete_insert" on session_athlete_notes
  for insert with check (athlete_id = auth.uid());

create policy "session_athlete_notes_athlete_update" on session_athlete_notes
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy "session_athlete_notes_coach_all" on session_athlete_notes
  for all using (is_coach()) with check (is_coach());

-- L'athlète peut re-logger une séance (supprimer puis réinsérer ses propres séries)
create policy "performances_athlete_delete_own_session_log" on performances
  for delete using (athlete_id = auth.uid() and session_id is not null);
