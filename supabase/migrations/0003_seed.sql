-- Dauphins du TOEC — données de départ

insert into exercises (name, category) values
  ('Squat barre', 'musculation'),
  ('Développé couché', 'musculation'),
  ('Soulevé de terre', 'musculation'),
  ('Hip thrust', 'musculation'),
  ('Tractions', 'musculation'),
  ('Fentes', 'musculation'),
  ('Gainage', 'renfo'),
  ('Gainage latéral', 'renfo'),
  ('Nordic curl', 'renfo'),
  ('Vélo', 'cardio'),
  ('Rameur', 'cardio'),
  ('Mobilité épaules', 'mobilite'),
  ('Mobilité hanches', 'mobilite'),
  ('Étirements post-séance', 'filler'),
  ('Proprioception cheville', 'filler')
on conflict (name) do nothing;

-- compétition par défaut, à modifier depuis le bandeau
insert into next_competition (name, date, is_active)
values ('Prochaine compétition', current_date + interval '30 days', true);

-- Palette de couleurs pour les groupes, assignée dans cet ordre à la création
-- (logique appliquée côté frontend, documentée ici pour référence)
-- 1. #2E9E3A  2. #1565C0  3. #E65100  4. #6A1B9A  5. #B71C1C  6. #00838F
