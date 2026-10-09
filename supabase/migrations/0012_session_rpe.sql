-- Dauphins du TOEC — score RPE (difficulté ressentie, 1-10) par séance et par athlète

alter table session_athlete_notes add column rpe smallint check (rpe between 1 and 10);
