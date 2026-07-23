-- Dauphins du TOEC — Row Level Security
-- Rôles : coach (accès total) / athlete (accès restreint à ses propres données)

-- ============================================================
-- Fonctions utilitaires (SECURITY DEFINER pour lire profiles sans RLS récursive)
-- ============================================================
create or replace function is_coach()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'coach'
  );
$$;

create or replace function my_group_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select group_id from athlete_groups where athlete_id = auth.uid();
$$;

-- ============================================================
-- PROFILES
-- ============================================================
alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select using (id = auth.uid() or is_coach());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_coach_all" on profiles
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- ATHLETES — l'athlète lit sa fiche, seul le coach l'édite
-- ============================================================
alter table athletes enable row level security;

create policy "athletes_select" on athletes
  for select using (is_coach() or id = auth.uid());

create policy "athletes_coach_write" on athletes
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- ATHLETE TAGS
-- ============================================================
alter table athlete_tags enable row level security;

create policy "athlete_tags_select" on athlete_tags
  for select using (is_coach() or athlete_id = auth.uid());

create policy "athlete_tags_self_insert_questionnaire" on athlete_tags
  for insert with check (athlete_id = auth.uid() and source = 'questionnaire');

create policy "athlete_tags_self_delete_questionnaire" on athlete_tags
  for delete using (athlete_id = auth.uid() and source = 'questionnaire');

create policy "athlete_tags_coach_write" on athlete_tags
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- GROUPES — visibles par tous les connectés, gérés par le coach
-- ============================================================
alter table groups enable row level security;

create policy "groups_select_all" on groups
  for select using (auth.role() = 'authenticated');

create policy "groups_coach_write" on groups
  for all using (is_coach()) with check (is_coach());

alter table athlete_groups enable row level security;

create policy "athlete_groups_select" on athlete_groups
  for select using (is_coach() or athlete_id = auth.uid());

create policy "athlete_groups_coach_write" on athlete_groups
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- EXERCICES — lecture pour tous, création libre (perf logging), gestion coach
-- ============================================================
alter table exercises enable row level security;

create policy "exercises_select_all" on exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_insert_authenticated" on exercises
  for insert with check (auth.role() = 'authenticated');

create policy "exercises_coach_update" on exercises
  for update using (is_coach()) with check (is_coach());

create policy "exercises_coach_delete" on exercises
  for delete using (is_coach());

-- ============================================================
-- PERFORMANCES — chacun lit/ajoute les siennes, coach lit/gère tout
-- ============================================================
alter table performances enable row level security;

create policy "performances_select" on performances
  for select using (is_coach() or athlete_id = auth.uid());

create policy "performances_insert" on performances
  for insert with check (is_coach() or athlete_id = auth.uid());

create policy "performances_coach_update" on performances
  for update using (is_coach()) with check (is_coach());

create policy "performances_coach_delete" on performances
  for delete using (is_coach());

-- ============================================================
-- SÉANCES — coach gère tout, athlète voit les séances (non-template) de ses groupes
-- ============================================================
alter table sessions enable row level security;

create policy "sessions_select" on sessions
  for select using (
    is_coach()
    or (is_template = false and group_id in (select my_group_ids()))
  );

create policy "sessions_coach_write" on sessions
  for all using (is_coach()) with check (is_coach());

alter table session_blocks enable row level security;

create policy "session_blocks_select" on session_blocks
  for select using (
    exists (
      select 1 from sessions s
      where s.id = session_blocks.session_id
        and (is_coach() or (s.is_template = false and s.group_id in (select my_group_ids())))
    )
  );

create policy "session_blocks_coach_write" on session_blocks
  for all using (is_coach()) with check (is_coach());

alter table session_exercises enable row level security;

create policy "session_exercises_select" on session_exercises
  for select using (
    exists (
      select 1 from session_blocks b
      join sessions s on s.id = b.session_id
      where b.id = session_exercises.block_id
        and (is_coach() or (s.is_template = false and s.group_id in (select my_group_ids())))
    )
  );

create policy "session_exercises_coach_write" on session_exercises
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- COMPÉTITION — visible par tous, éditée par le coach
-- ============================================================
alter table next_competition enable row level security;

create policy "next_competition_select_all" on next_competition
  for select using (auth.role() = 'authenticated');

create policy "next_competition_coach_write" on next_competition
  for all using (is_coach()) with check (is_coach());

-- ============================================================
-- QUESTIONNAIRE — l'athlète remplit/lit le sien, coach lit/gère tout
-- ============================================================
alter table questionnaire_responses enable row level security;

create policy "questionnaire_select" on questionnaire_responses
  for select using (is_coach() or athlete_id = auth.uid());

create policy "questionnaire_insert_own" on questionnaire_responses
  for insert with check (athlete_id = auth.uid() or is_coach());

create policy "questionnaire_update_own" on questionnaire_responses
  for update using (athlete_id = auth.uid() or is_coach())
  with check (athlete_id = auth.uid() or is_coach());

create policy "questionnaire_coach_delete" on questionnaire_responses
  for delete using (is_coach());
