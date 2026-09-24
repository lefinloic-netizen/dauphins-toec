-- Dauphins du TOEC — protocole individuel évolutif par athlète
-- Un document vivant par athlète (pas d'historique de versions), avec un tableau
-- d'exercices ciblés et un retour de l'athlète. Les "zones de travail" s'appuient
-- sur les tags "à travailler" déjà existants sur la fiche de l'athlète.

create table athlete_protocols (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null unique references athletes (id) on delete cascade,
  zones_notes text,
  athlete_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger athlete_protocols_set_updated_at
before update on athlete_protocols
for each row execute function set_updated_at();

create table protocol_exercises (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references athlete_protocols (id) on delete cascade,
  exercise_name text not null,
  zone text,
  sets text,
  reps text,
  charge text,
  recovery text,
  observations text,
  order_index int not null default 0
);

create index protocol_exercises_protocol_id_idx on protocol_exercises (protocol_id);

alter table athlete_protocols enable row level security;

create policy "athlete_protocols_select" on athlete_protocols
  for select using (is_coach() or athlete_id = auth.uid());

-- L'athlète ne modifie que son propre retour (champ athlete_comment côté UI) ;
-- le reste (zones, exercices) est géré par le coach.
create policy "athlete_protocols_athlete_update" on athlete_protocols
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy "athlete_protocols_coach_all" on athlete_protocols
  for all using (is_coach()) with check (is_coach());

alter table protocol_exercises enable row level security;

create policy "protocol_exercises_select" on protocol_exercises
  for select using (
    is_coach()
    or exists (
      select 1 from athlete_protocols ap
      where ap.id = protocol_exercises.protocol_id and ap.athlete_id = auth.uid()
    )
  );

create policy "protocol_exercises_coach_all" on protocol_exercises
  for all using (is_coach()) with check (is_coach());
