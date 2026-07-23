-- Dauphins du TOEC — catégorie "Natation" + remise à zéro des records

-- Autorise la nouvelle catégorie dans la contrainte existante
alter table exercises drop constraint exercises_category_check;
alter table exercises add constraint exercises_category_check
  check (category in ('musculation', 'mobilite', 'filler', 'renfo', 'cardio', 'natation'));

-- Remise à zéro : plus aucun exercice n'est suivi comme record, le coach re-sélectionne
-- au fur et à mesure depuis la Bibliothèque.
update exercises set is_record = false;
