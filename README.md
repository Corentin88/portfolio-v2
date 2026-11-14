# Portfolio 2.0

Bienvenue sur le dépôt de mon Portfolio 2.0, une application que j'ai développée avec Next.js, React et TypeScript pour présenter mon parcours de développeur full-stack, mes compétences et mes projets.

Cette nouvelle version me permet également de présenter l'évolution de mes applications (V1, V2…) et dispose d'une interface d'administration complète pour gérer les contenus, les projets et les médias sans intervenir directement dans le code.

> L'ancien portfolio reste en ligne jusqu'à la mise en production de cette version. Le déploiement sur VPS est prévu ultérieurement : ce dépôt couvre aujourd'hui le développement local, la production locale sous Docker et l'intégration continue.

## Fonctionnalités

### Site public

- Page d'accueil en une seule page : présentation, compétences par piliers et catégories, catalogue de projets filtrable, parcours (timeline) et formulaire de contact.
- Fiche détaillée de chaque projet, en page autonome (`/projets/[slug]`) ou en fenêtre modale depuis le catalogue, avec ses versions successives : points forts, défis, technologies, captures d'écran.
- CV en PDF servi à une adresse stable (`/cv`, `?download=1` pour forcer le téléchargement).
- Thème clair / sombre, animations discrètes, accessibilité contrôlée par les tests (axe).
- Référencement : métadonnées éditables, `sitemap.xml`, `robots.txt`, URLs canoniques.
- Formulaire de contact avec validation, limitation anti-abus et envoi par Resend (le visiteur est en Reply-To).

### Administration (`/admin`)

- Compte administrateur unique (Auth.js, identifiants, sessions JWT, mots de passe hachés en Argon2id, limitation des tentatives).
- Projets : création, édition, statut brouillon / publié / archivé, ordre, catégories, badges, versions avec points forts, défis, technologies et captures.
- Compétences : piliers, catégories et technologies.
- Parcours : étapes de la timeline.
- Contenus de l'accueil, coordonnées de contact et réglages SEO.
- Médiathèque : import d'images (redimensionnées et converties par Sharp) et de PDF, dossiers, sélection multiple, détection des médias non utilisés.
- Messages de contact : recherche, statuts non lu / lu / traité, suppression, conservation limitée dans le temps (365 jours par défaut).

## Stack technique

- [Next.js 16](https://nextjs.org/) (App Router, Server Components, Server Actions, `cacheComponents`) et React 19
- TypeScript en mode strict, validation Zod
- Tailwind CSS 4
- Prisma 7 (adaptateur MariaDB) et MariaDB 12
- Auth.js 5 et Argon2id
- Sharp pour le traitement des images, Resend pour l'e-mail
- Vitest (tests unitaires), Playwright et axe-core (tests de bout en bout)
- Docker (image Next.js autonome, utilisateur non root) et Docker Compose
- GitHub Actions, ESLint et Prettier

## Architecture

Monolithe modulaire Next.js, organisé par domaine métier :

```text
src/
  app/            Routes (pages publiques, /admin, /api, /media, /cv, sitemap, robots)
  features/       Domaines métier : auth, contact, media, projects, site-settings, skills, timeline
    <domaine>/
      schemas.ts    Validation Zod
      queries.ts    Lectures (Prisma)
      service.ts    Règles métier et écritures
      actions.ts    Server Actions
      components/   Composants du domaine (public et admin/)
  components/     Interface partagée (mise en page, thème, briques d'administration)
  lib/            Technique transversal (base, environnement, cache, stockage, e-mail, limitation)
  proxy.ts        Redirections d'accès à /admin (la vérification réelle se fait côté serveur)
prisma/           Schéma, migrations versionnées et seed initial
e2e/              Tests Playwright et utilitaires (base et stockage E2E isolés)
scripts/          Création du compte admin, audit des médias, scripts Docker (env, import, sauvegarde)
```

Principes : Server Components par défaut ; chaque mutation passe par `requireAdmin()`, puis validation Zod, service, et invalidation du cache. Prisma n'est utilisé que dans `queries.ts`, `service.ts` et `src/lib/db.ts`. Les médias sont stockés sur disque (hors base) et servis par la route `/media`.

## Prérequis

- Node.js 20.19 ou plus récent (22 recommandé, version utilisée par la CI et l'image Docker)
- Une instance MariaDB accessible (12.1 en local et en CI)
- Docker Desktop, uniquement pour la production locale conteneurisée

## Installation

```bash
npm install          # lance aussi `prisma generate` (client généré dans src/generated, non versionné)
cp .env.example .env # puis compléter
```

## Variables d'environnement

Deux modèles sans secret sont versionnés ; les fichiers réels (`.env`, `.env.docker`) sont ignorés par Git et par le contexte de build Docker.

| Fichier               | Usage                                                  |
| --------------------- | ------------------------------------------------------ |
| `.env.example`        | Développement local (`.env`), lu par Next.js et Prisma |
| `.env.docker.example` | Conteneur de production locale (`.env.docker`)         |

| Variable                 | Rôle                                                                            |
| ------------------------ | ------------------------------------------------------------------------------- |
| `SITE_URL`               | Adresse publique du site (liens absolus, canoniques, sitemap)                   |
| `DATABASE_URL`           | Base MariaDB applicative (`mysql://…`)                                          |
| `SHADOW_DATABASE_URL`    | Base shadow de `prisma migrate dev`, suffixée `_shadow` (développement seul)    |
| `AUTH_SECRET`            | Secret de signature des sessions, propre à chaque environnement                 |
| `AUTH_TRUST_HOST`        | `true` en local ou derrière un reverse proxy de confiance                       |
| `AUTH_URL`               | Adresse exacte utilisée par Auth.js (Docker)                                    |
| `RESEND_API_KEY`         | Clé Resend (vide : formulaire de contact indisponible, aucun envoi)             |
| `CONTACT_FROM`           | Expéditeur sur le domaine vérifié chez Resend                                   |
| `CONTACT_RETENTION_DAYS` | Conservation des messages reçus, en jours (365 par défaut)                      |
| `MEDIA_ROOT`             | Racine des médias (`./storage/media` par défaut, `/data/media` dans l'image)    |
| `STATE_DIR`              | Compteurs anti-abus persistants (`./storage/state`, `/data/state` dans l'image) |

Un secret de session se génère avec `npx auth secret --raw`.

## Base de données MariaDB

L'application utilise une instance MariaDB existante avec un compte dédié. Bases attendues :

| Base                  | Usage                                                             |
| --------------------- | ----------------------------------------------------------------- |
| `portfolio_v2`        | Base applicative                                                  |
| `portfolio_v2_shadow` | Base temporaire de `prisma migrate dev`, vidée à chaque exécution |
| `portfolio_v2_e2e`    | Base des tests Playwright, vidée et remplie de données fictives   |

Créer les bases et accorder au compte applicatif les droits nécessaires sur chacune, puis :

```bash
npx prisma migrate deploy   # applique les migrations versionnées
npx prisma db seed          # contenus initiaux (idempotent, n'écrase jamais l'existant)
```

En développement, une modification du schéma se traduit par `npx prisma migrate dev --name <nom>`, qui exige `SHADOW_DATABASE_URL`. Des garde-fous refusent une base shadow identique à la base principale ou non suffixée `_shadow`, et une base E2E non suffixée `_e2e`.

## Compte administrateur

```bash
npm run admin:create
```

Le script crée le compte administrateur unique. L'adresse, le nom et le mot de passe sont saisis au clavier uniquement (ni argument, ni variable, ni fichier) ; seule l'empreinte Argon2id est enregistrée. L'administration est ensuite accessible sur `/admin/login`.

## Développement local

```bash
npm run dev   # http://localhost:3000
```

Les médias importés sont écrits dans `storage/media` et les compteurs anti-abus dans `storage/state` (dossiers non versionnés).

## Production locale avec Docker

Image Next.js autonome (sortie `standalone`, utilisateur non root, empreinte d'image épinglée) servie par `compose.yaml`. MariaDB n'est pas gérée par ce Compose : le conteneur rejoint l'instance existante désignée par `DATABASE_URL`. Les médias et l'état vivent dans deux volumes **externes**, qui doivent exister avant le premier démarrage et ne sont jamais supprimés par `docker compose down -v`.

1. Créer `.env.docker` : `pwsh scripts/docker/new-env.ps1` le génère depuis `.env` (nouveau secret, hôte `host.docker.internal`), ou copier `.env.docker.example` et le compléter.
2. Créer les volumes :
   - avec reprise des médias locaux : `pwsh scripts/docker/import-storage.ps1` (copie non destructive de `storage/` avec contrôle d'empreintes) ;
   - ou vides : `docker volume create portfolio_v2_media` et `docker volume create portfolio_v2_state`.
3. Construire et démarrer :

```bash
docker compose up -d --build         # http://127.0.0.1:3200 (port réglable : PORTFOLIO_HTTP_PORT)
docker compose logs -f portfolio-v2
docker compose down                  # arrête le conteneur, volumes conservés
```

Les migrations ne sont jamais lancées au démarrage. Une cible dédiée les applique à la demande :

```bash
docker build --target migrator -t portfolio-v2-migrator:local .
docker run --rm --env-file <fichier> portfolio-v2-migrator:local
```

Le conteneur expose `/api/health` (vérifie la base) pour son healthcheck.

## Tests

```bash
npm run check   # TypeScript, ESLint et Prettier
npm test        # tests unitaires Vitest
npm run e2e     # build de production puis tests Playwright
```

Les tests E2E tournent sur un build de production (port 3100) avec une base dédiée : variable de shell `E2E_DATABASE_URL` si elle est définie, sinon `DATABASE_URL` du `.env` suffixée `_e2e`. La base est vidée puis remplie de données fictives ; médias et compteurs sont isolés dans `storage/e2e` ; Resend est désactivé. Ils couvrent les parcours publics, l'administration, le contact, la médiathèque, l'accessibilité, les en-têtes HTTP et la performance. Installer le navigateur une fois avec `npx playwright install chromium`.

## Intégration continue

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) s'exécute à chaque push sur `main`, à chaque pull request et à la demande :

- **Vérifications** : `npm ci`, `npm run check`, `npm test`, `npm audit` (dépendances de production), `npm run build` ;
- **Image Docker** : build, démarrage sans base, contrôle de `robots.txt`, du healthcheck (503 attendu) et de l'utilisateur non root ; aucune publication ;
- **E2E** : MariaDB éphémère propre au workflow, puis `npm run e2e`.

Toutes les valeurs utilisées par la CI sont fictives ; aucun secret, aucune base réelle, aucun déploiement.

## Sauvegarde et restauration

Scripts PowerShell 7 dans `scripts/docker/`, en lecture seule sur les données d'origine :

- `backup.ps1` produit un dossier horodaté (par défaut hors du dépôt, dans `~/Backups/portfolio-v2`) : dump SQL compressé de `portfolio_v2`, archives des volumes médias et état, empreintes SHA-256. Ce dossier est autonome et doit être copié hors de la machine.
- `verify-backup.ps1 -Path <dossier> [-WithDatabase]` vérifie une sauvegarde par restauration isolée (volumes temporaires, MariaDB éphémère), sans toucher aux données réelles.
- `restore-volumes.sh <dossier> [--with-state]` restaure les volumes sur un serveur Linux, après contrôle des archives ; il refuse d'écraser un volume non vide.
- La base se restaure en important `portfolio_v2.sql.gz` dans une base vide (`gunzip -c portfolio_v2.sql.gz | mariadb … portfolio_v2`).

`npm run media:audit` liste, sans rien modifier, les fichiers manquants ou orphelins du stockage des médias.

## Scripts npm

| Commande               | Rôle                                                 |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Serveur de développement                             |
| `npm run build`        | Build de production                                  |
| `npm run start`        | Démarre le build de production                       |
| `npm run typecheck`    | Vérification TypeScript                              |
| `npm run lint`         | Analyse ESLint                                       |
| `npm run format`       | Formatage Prettier                                   |
| `npm run check`        | Types, lint et formatage en une commande             |
| `npm test`             | Tests unitaires (Vitest)                             |
| `npm run e2e`          | Build puis tests E2E Playwright (base `_e2e` dédiée) |
| `npm run e2e:run`      | Tests E2E sans rebuild                               |
| `npm run db:validate`  | Validation et formatage du schéma Prisma             |
| `npm run admin:create` | Création interactive du compte administrateur unique |
| `npm run media:audit`  | Audit en lecture seule du stockage des médias        |

## Licence

Code source publié à titre de démonstration. Tous droits réservés, notamment sur les contenus (textes, images, CV).
