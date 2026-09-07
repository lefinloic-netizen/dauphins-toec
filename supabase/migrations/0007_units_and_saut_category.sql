-- Dauphins du TOEC — unités de performance (temps pour la natation, cm pour les sauts)
-- et nouvelle catégorie "Saut".

alter table exercises drop constraint exercises_category_check;
alter table exercises add constraint exercises_category_check
  check (category in ('musculation', 'mobilite', 'filler', 'renfo', 'cardio', 'natation', 'saut'));

-- La vue dépend de la colonne value_kg, il faut la supprimer avant de pouvoir
-- modifier le type de la colonne, puis la recréer.
drop view if exists athlete_records;

-- Élargit la précision pour stocker des temps au millième de seconde (ex: 65.340 pour 1'05"340)
alter table performances alter column value_kg type numeric(8, 3);

-- Le "record" est la valeur la plus haute pour un poids/une distance de saut, mais la
-- valeur la plus basse pour un temps de natation (le temps le plus rapide).
create view athlete_records as
select
  p.athlete_id,
  p.exercise_id,
  case when e.category = 'natation' then min(p.value_kg) else max(p.value_kg) end as record_kg
from performances p
join exercises e on e.id = p.exercise_id
group by p.athlete_id, p.exercise_id, e.category;
