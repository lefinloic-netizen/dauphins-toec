-- Dauphins du TOEC — nettoyage ponctuel des séries dupliquées
--
-- Un bug (maintenant corrigé côté application) faisait qu'un exercice présent dans
-- plusieurs blocs d'une même séance voyait ses séries enregistrées une fois par bloc
-- (4 séries réelles pouvaient donc apparaître comme 8, 16...). Cette requête supprime
-- les lignes strictement identiques (même athlète, même séance, même exercice, même
-- numéro de série, même charge, même reps) en n'en gardant qu'une seule par groupe.
--
-- ⚠️ C'est une suppression de données. Elle ne touche que les vrais doublons exacts
-- (aucune perf "unique" ne sera supprimée) mais vérifie que tu es d'accord avant de
-- lancer cette requête.

delete from performances p
where p.session_id is not null
  and exists (
    select 1 from performances p2
    where p2.athlete_id = p.athlete_id
      and p2.session_id = p.session_id
      and p2.exercise_id = p.exercise_id
      and p2.set_number = p.set_number
      and p2.value_kg = p.value_kg
      and coalesce(p2.reps, -1) = coalesce(p.reps, -1)
      and p2.id < p.id
  );
