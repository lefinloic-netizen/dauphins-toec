-- Dauphins du TOEC — records configurables par le coach
-- Au lieu de figer les "records" sur la catégorie "musculation", le coach choisit
-- librement, exercice par exercice, ce qui doit apparaître dans les records suivis.

alter table exercises add column is_record boolean not null default false;

-- on préserve le comportement actuel : les exercices déjà en musculation restent suivis
update exercises set is_record = true where category = 'musculation';
