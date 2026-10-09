-- Dauphins du TOEC — bibliothèque générale de protocoles (échauffement/mobilité/renfo)
-- Consultable par tous les athlètes, gérée par le coach. Distinct du "protocole
-- individuel" par athlète déjà existant.

create table protocol_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('echauffement', 'mobilite', 'renfo')),
  zone text,
  description text,
  video_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table protocol_library enable row level security;

create policy "protocol_library_select_all" on protocol_library
  for select using (auth.role() = 'authenticated');

create policy "protocol_library_coach_write" on protocol_library
  for all using (is_coach()) with check (is_coach());
