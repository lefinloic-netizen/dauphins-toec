# Dauphins du TOEC — App

App de gestion d'effectif, programmation et suivi de performances pour le groupe de natation "Les Dauphins du TOEC".

## Stack

- Frontend : React + Vite + TypeScript + Tailwind CSS + Recharts
- Backend : Supabase (Postgres + Auth + Row Level Security + Edge Functions)
- Hébergement : Vercel (frontend) + Supabase Cloud (backend)

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → crée un compte gratuit → "New project".
2. Note l'URL du projet et la clé `anon public` (Settings → API) — elles iront dans `.env.local`.

## 2. Appliquer les migrations

Le schéma complet est dans `supabase/migrations/`, à exécuter **dans l'ordre** (SQL Editor → New query → coller → Run) :

- `0001_schema.sql` — toutes les tables
- `0002_rls.sql` — sécurité (accès coach / athlète)
- `0003_seed.sql` — exercices de base + compétition par défaut
- `0004_session_logs.sql` — journal de séance athlète (séries/reps + commentaire)
- `0005_configurable_records.sql` — records configurables par exercice
- `0006_natation_category_and_reset_records.sql` — catégorie Natation + remise à zéro des records

## 3. Déployer les Edge Functions

Deux fonctions, à déployer depuis le dashboard (`Edge Functions` → `Deploy a new function` → coller le code → `Deploy`), ou via la CLI :

```
supabase functions deploy invite-athlete
supabase functions deploy delete-athlete
```

- `invite-athlete` — crée le compte d'un(e) athlète invité(e) par le coach.
- `delete-athlete` — supprime définitivement un compte athlète.

Elles utilisent `SUPABASE_SERVICE_ROLE_KEY`, auto-injectée par Supabase, aucune action requise.

## 4. Créer ton compte coach

1. Dashboard Supabase → `Authentication` → `Add user` → renseigne ton email + mot de passe.
2. `SQL Editor` → exécute (en remplaçant l'uuid et l'email) :
   ```sql
   insert into profiles (id, role, first_name, last_name, email)
   values ('<uuid-de-l-utilisateur-créé>', 'coach', 'Loïc', 'Lefin', 'ton-email@example.com');
   ```

## 5. Variables d'environnement (frontend)

Crée un fichier `.env.local` à la racine (jamais commité, déjà dans `.gitignore`) :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 6. Pousser le code sur GitHub

Le repo git local est déjà initialisé avec un premier commit. Pour le pousser :

1. Crée un nouveau repo (vide, sans README) sur [github.com/new](https://github.com/new).
2. Récupère son URL (`https://github.com/ton-compte/ton-repo.git`).
3. Connecte-le et pousse :
   ```
   git remote add origin https://github.com/ton-compte/ton-repo.git
   git push -u origin main
   ```

## 7. Déploiement Vercel

1. Sur [vercel.com](https://vercel.com) → "Add New" → "Project" → importe le repo GitHub.
2. Vercel détecte Vite automatiquement (build `npm run build`, dossier `dist`) — rien à changer.
3. Dans "Environment Variables", ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (les mêmes valeurs que `.env.local`).
4. Déploie. Tu obtiens une URL du type `https://ton-projet.vercel.app`.

## 8. Mettre à jour la configuration Supabase avec l'URL de prod

Une fois l'URL Vercel connue :

1. Dashboard Supabase → `Authentication` → `URL Configuration`.
2. **Site URL** : remplace par ton URL Vercel.
3. **Redirect URLs** : ajoute `https://ton-projet.vercel.app/*` (garde aussi `http://localhost:5173/*` si tu continues à développer en local).

Sans ça, les emails d'invitation et de réinitialisation de mot de passe renverront vers localhost au lieu du site en ligne.

## Statut du projet

- [x] Schéma de base de données + RLS
- [x] Edge Functions (invitation + suppression athlète)
- [x] Scaffolding frontend (React + Vite + Tailwind)
- [x] Authentification frontend (login coach / athlète, mot de passe oublié)
- [x] Vue coach (6 onglets : Dashboard, Programmation, Créer une séance, Historique, Bibliothèque, Groupes)
- [x] Vue athlète (fiche perso, perfs par série, séances assignées, commentaire de séance)
- [x] Questionnaire d'entrée
- [x] Connexion à un vrai projet Supabase
- [x] Dépôt git initialisé
- [ ] Poussé sur GitHub
- [ ] Déployé sur Vercel
- [ ] Configuration Supabase mise à jour avec l'URL de prod
