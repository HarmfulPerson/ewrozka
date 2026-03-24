#!/bin/bash
# Database backup script for eWróżka
# Usage: ./scripts/backup-db.sh [prod|staging]
# Add to crontab: 0 3 * * * /opt/ewrozka/ewrozka/scripts/backup-db.sh prod

set -euo pipefail

ENV="${1:-prod}"
BACKUP_DIR="/opt/ewrozka/backups/${ENV}"
RETAIN_DAYS="${2:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Pick the right compose file, env file, and service name
if [ "$ENV" = "prod" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE="${COMPOSE_DIR}/.env.production"
  DB_SERVICE="db"
elif [ "$ENV" = "staging" ]; then
  COMPOSE_FILE="docker-compose.staging.yml"
  ENV_FILE="${COMPOSE_DIR}/.env.staging"
  DB_SERVICE="db-staging"
else
  echo "Usage: $0 [prod|staging] [retain_days]"
  exit 1
fi

# Load env vars (DATABASE_USERNAME, DATABASE_NAME)
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Warning: ${ENV_FILE} not found, using defaults"
fi

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="${BACKUP_DIR}/ewrozka_${ENV}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting ${ENV} database backup..."

# pg_dump through docker compose, compress on the fly
docker compose -f "${COMPOSE_DIR}/${COMPOSE_FILE}" exec -T "$DB_SERVICE" \
  pg_dump -U "${DATABASE_USERNAME:-postgres}" -d "${DATABASE_NAME:-ewrozka}" \
  --no-owner --no-acl --clean --if-exists \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup saved: ${BACKUP_FILE} (${FILESIZE})"

# Rotate old backups
DELETED=$(find "$BACKUP_DIR" -name "ewrozka_${ENV}_*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Rotated ${DELETED} backup(s) older than ${RETAIN_DAYS} days"
fi

echo "[$(date)] Backup complete."
