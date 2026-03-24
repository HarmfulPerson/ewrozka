#!/bin/bash
# Database restore script for eWróżka
# Usage: ./scripts/restore-db.sh [prod|staging] <backup_file.sql.gz>
# Example: ./scripts/restore-db.sh prod /opt/ewrozka/backups/prod/ewrozka_prod_20260324_030000.sql.gz

set -euo pipefail

ENV="${1:-}"
BACKUP_FILE="${2:-}"

if [ -z "$ENV" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 [prod|staging] <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /opt/ewrozka/backups/"${ENV:-prod}"/*.sql.gz 2>/dev/null || echo "  No backups found."
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$ENV" = "prod" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE="${COMPOSE_DIR}/.env.production"
  DB_SERVICE="db"
elif [ "$ENV" = "staging" ]; then
  COMPOSE_FILE="docker-compose.staging.yml"
  ENV_FILE="${COMPOSE_DIR}/.env.staging"
  DB_SERVICE="db-staging"
else
  echo "Error: environment must be 'prod' or 'staging'"
  exit 1
fi

# Load env vars
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "======================================"
echo " RESTORE DATABASE"
echo " Environment: ${ENV}"
echo " File: ${BACKUP_FILE}"
echo " Size: ${FILESIZE}"
echo "======================================"
echo ""
read -p "This will OVERWRITE the ${ENV} database. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date)] Restoring ${ENV} database from ${BACKUP_FILE}..."

gunzip -c "$BACKUP_FILE" | docker compose -f "${COMPOSE_DIR}/${COMPOSE_FILE}" exec -T "$DB_SERVICE" \
  psql -U "${DATABASE_USERNAME:-postgres}" -d "${DATABASE_NAME:-ewrozka}" --single-transaction

echo "[$(date)] Restore complete. Verify the application is working correctly."
