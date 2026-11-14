#!/usr/bin/env bash
# Portfolio 2.0 — restauration des volumes sur un serveur Linux (futur VPS Ubuntu).
#
#   ./restore-volumes.sh <dossier-de-sauvegarde> [--with-state]
#
# Le dossier est celui produit par backup.ps1 (copié par scp/rsync). Le script :
#   1. vérifie les archives (sha256sum -c SHA256SUMS) ;
#   2. crée les volumes nommés s'ils n'existent pas — refuse un volume non vide ;
#   3. extrait l'archive, fixe propriétaire (uid 1000 = `node`) et droits ;
#   4. contrôle chaque fichier restauré contre <prefix>.sha256.
# Les compteurs anti-spam (state) sont temporaires : restaurés seulement avec --with-state.
set -euo pipefail

BACKUP_DIR="$(cd "${1:?Usage : $0 <dossier-de-sauvegarde> [--with-state]}" && pwd)"
WITH_STATE="${2:-}"
HELPER_IMAGE="${HELPER_IMAGE:-node:22-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee}"

(cd "$BACKUP_DIR" && sha256sum --quiet -c SHA256SUMS)
echo "Archives conformes."

restore() {
  local prefix="$1" volume="portfolio_v2_$1"
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    docker volume create --label project=portfolio-v2 --label "content=$prefix" "$volume" >/dev/null
    echo "Volume $volume créé."
  fi
  local entries
  entries="$(docker run --rm -v "$volume:/v:ro" "$HELPER_IMAGE" sh -c 'find /v -mindepth 1 | wc -l')"
  if [ "$entries" -gt 0 ]; then
    echo "Refus : $volume contient déjà $entries entrée(s), rien n'est écrasé." >&2
    return 1
  fi
  docker run --rm -v "$volume:/v" -v "$BACKUP_DIR:/backup:ro" "$HELPER_IMAGE" sh -c "
    tar -xzf /backup/$prefix.tar.gz -C /v &&
    chown -R 1000:1000 /v && find /v -type d -exec chmod 750 {} + && find /v -type f -exec chmod 640 {} + &&
    cd /v && sha256sum --quiet -c /backup/$prefix.sha256 &&
    echo \"$volume : \$(find . -type f | wc -l) fichier(s) restauré(s), empreintes conformes.\""
}

restore media
if [ "$WITH_STATE" = "--with-state" ] && [ -f "$BACKUP_DIR/state.tar.gz" ]; then
  restore state
else
  docker volume create --label project=portfolio-v2 --label content=state portfolio_v2_state >/dev/null
  echo "portfolio_v2_state créé vide (compteurs anti-spam non transférés)."
fi
