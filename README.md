# Dauphins du TOEC — App

App de gestion d'effectif, programmation et suivi de performances pour le groupe de natation "Les Dauphins du TOEC".

## Stack

- Frontend : React + Vite + TypeScript + Tailwind CSS + Recharts
- Backend : Supabase (Postgres + Auth + Row Level Security + Edge Functions)
- Hébergement : Vercel (frontend) + Supabase Cloud (backend)

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → crée un compte gratuit → "New project".
2. Note l'URL du projet et la clé `anon public` (Settings → API) — elles iront dans `.env`.

## 2. Appliquer les migrations

Le schéma complet est dans `supabase/migrations/` (3 fichiers, à exécuter dans l'ordre) :

- `0001_schema.sql` — toutes les tables
- `0002_rls.sql` — sécurité (accès coach / athlète)
- `0003_seed.sql` — exercices de base + compétition par défaut

**Option simple (sans CLI)** : ouvre chaque fichier dans l'éditeur SQL du dashboard Supabase (`SQL Editor` → `New query`), colle le contenu, exécute — dans l'ordre 0001 → 0002 → 0003.

**Option CLI** (si `supabase` CLI installé) :
```
supabase link --project-ref <ton-project-ref>
supabase db push
```

## 3. Déployer l'Edge Function d'invitation

`supabase/functions/invite-athlete` crée le compte d'un(e) athlète (le coach l'invite depuis le Dashboard, l'athlète reçoit un email pour définir son mot de passe).

```
supabase functions deploy invite-athlete
```

Cette fonction a besoin de `SUPABASE_SERVICE_ROLE_KEY` (auto-injectée par Supabase pour les Edge Functions, pas d'action requise).

## 4. Créer ton compte coach

Le tout premier compte (toi, le coach) se crée manuellement :

1. Dashboard Supabase → `Authentication` → `Add user` → renseigne ton email + mot de passe.
2. `SQL Editor` → exécute :
   ```sql
   insert into profiles (id, role, first_name, last_name, email)
   values ('<uuid-de-l-utilisateur-créé>', 'coach', 'Loïc', 'Lefin', 'ton-email@example.com');
   ```
   (l'uuid est visible dans la liste des utilisateurs créés à l'étape précédente).

## 5. Variables d'environnement (frontend)

Une fois le projet React scaffoldé, crée un fichier `.env.local` à la racine :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 6. Déploiement Vercel

1. Pousse le repo sur GitHub.
2. Sur [vercel.com](https://vercel.com) → "Import Project" → sélectionne le repo.
3. Ajoute les mêmes variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dans les paramètres du projet Vercel.
4. Déploie.

## Statut du projet

- [x] Schéma de base de données + RLS
- [x] Edge Function d'invitation athlète
- [x] Scaffolding frontend (React + Vite + Tailwind)
- [x] Authentification frontend (login coach / athlète)
- [x] Vue coach (6 onglets : Dashboard, Programmation, Créer une séance, Historique, Bibliothèque, Groupes)
- [x] Vue athlète (fiche perso, perfs, séances à venir)
- [x] Questionnaire d'entrée
- [ ] Connexion à un vrai projet Supabase (`.env.local` avec de vraies clés)
- [ ] Déploiement Vercel
