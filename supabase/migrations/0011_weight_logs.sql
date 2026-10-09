-- Dauphins du TOEC — suivi de poids au jour le jour par l'athlète
-- Séparé du champ "Poids" de la fiche (toujours géré par le coach) : ceci est un
-- journal optionnel que l'athlète alimente lui-même, visible en tendance.

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes (id) on delete cascade,
  weight_kg numeric(5, 2) not null,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (athlete_id, date)
);

create index weight_logs_athlete_id_idx on weight_logs (athlete_id);

alter table weight_logs enable row level security;

create policy "weight_logs_select" on weight_logs
  for select using (is_coach() or athlete_id = auth.uid());

create policy "weight_logs_athlete_insert" on weight_logs
  for insert with check (athlete_id = auth.uid());

create policy "weight_logs_athlete_update" on weight_logs
  for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy "weight_logs_athlete_delete" on weight_logs
  for delete using (athlete_id = auth.uid());

create policy "weight_logs_coach_all" on weight_logs
  for all using (is_coach()) with check (is_coach());
