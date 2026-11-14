# syntax=docker/dockerfile:1
# Portfolio 2.0 — image de production Next.js 16 (sortie standalone) + Prisma 7 (adaptateur MariaDB).
# Aucun secret ici : toute la configuration est fournie à l'exécution (env_file du Compose).

# Image épinglée par empreinte pour un build reproductible (mise à jour volontaire).
ARG NODE_IMAGE=node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

# ── 1. Dépendances (y compris dev : build et `prisma generate`) ──────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma/schema.prisma prisma/schema.prisma
# postinstall → `prisma generate` : client généré dans src/generated (aucune base requise).
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── 2. Build ─────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
ENV NODE_ENV=production NEXT_OUTPUT=standalone
# lib/db.ts valide DATABASE_URL au chargement ; le pool ne se connecte qu'à la
# première requête. URL factice limitée à cette commande, absente de l'image finale.
RUN DATABASE_URL="mysql://build:build@127.0.0.1:1/build_only" npm run build

# ── Migrations (cible manuelle, jamais lancée au démarrage de l'application) ──
#   docker build --target migrator -t portfolio-v2-migrator:local .
#   docker run --rm --env-file <fichier> portfolio-v2-migrator:local   # migrate deploy
FROM deps AS migrator
# Le moteur de schéma Prisma (binaire natif) requiert libssl, absente de l'image slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY prisma ./prisma
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ── 3. Exécution (cible par défaut : dernière étape) ─────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_ROOT=/data/media \
    STATE_DIR=/data/state

# Points de montage des volumes nommés : un volume vide hérite de ce propriétaire
# (utilisateur `node`, uid 1000) lors de son premier montage.
RUN mkdir -p /data/media /data/state && chown -R node:node /data

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# /api/health interroge la base : « unhealthy » signale aussi une base injoignable.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "server.js"]
