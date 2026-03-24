#!/bin/bash
# Rollback to a previous Docker image version
# Usage: ./scripts/rollback.sh [prod|staging] [sha]
#
# Without sha: lists available versions
# With sha:    rolls back to that version
#
# Example:
#   ./scripts/rollback.sh prod              # list available versions
#   ./scripts/rollback.sh prod abc1234      # rollback to abc1234

set -euo pipefail

ENV="${1:-}"
TARGET_SHA="${2:-}"
COMPOSE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$ENV" ]; then
  echo "Usage: $0 [prod|staging] [sha]"
  exit 1
fi

if [ "$ENV" = "prod" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ENV_FILE=".env.production"
  API_IMAGE="ewrozka-api"
  WEB_IMAGE="ewrozka-web"
  LAST_DEPLOY_FILE=".last-deploy-prod"
elif [ "$ENV" = "staging" ]; then
  COMPOSE_FILE="docker-compose.staging.yml"
  ENV_FILE=".env.staging"
  API_IMAGE="ewrozka-api-staging"
  WEB_IMAGE="ewrozka-web-staging"
  LAST_DEPLOY_FILE=".last-deploy-staging"
else
  echo "Error: environment must be 'prod' or 'staging'"
  exit 1
fi

cd "$COMPOSE_DIR"

# If no SHA provided, list available versions
if [ -z "$TARGET_SHA" ]; then
  echo "Available ${ENV} image versions:"
  echo ""
  echo "API images:"
  docker images "$API_IMAGE" --format "  {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -10
  echo ""
  echo "Web images:"
  docker images "$WEB_IMAGE" --format "  {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -10
  echo ""
  if [ -f "$LAST_DEPLOY_FILE" ]; then
    echo "Current deploy: $(cat "$LAST_DEPLOY_FILE")"
  fi
  echo ""
  echo "To rollback: $0 $ENV <sha>"
  exit 0
fi

# Verify target images exist
if ! docker image inspect "${API_IMAGE}:${TARGET_SHA}" &>/dev/null; then
  echo "Error: Image ${API_IMAGE}:${TARGET_SHA} not found"
  echo "Run '$0 $ENV' to see available versions"
  exit 1
fi

CURRENT_SHA="unknown"
if [ -f "$LAST_DEPLOY_FILE" ]; then
  CURRENT_SHA=$(cat "$LAST_DEPLOY_FILE")
fi

echo "======================================"
echo " ROLLBACK ${ENV^^}"
echo " Current: ${CURRENT_SHA}"
echo " Target:  ${TARGET_SHA}"
echo "======================================"
echo ""
read -p "Proceed with rollback? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date)] Rolling back to ${TARGET_SHA}..."

# Re-tag target images as latest
docker tag "${API_IMAGE}:${TARGET_SHA}" "${API_IMAGE}:latest"
docker tag "${WEB_IMAGE}:${TARGET_SHA}" "${WEB_IMAGE}:latest"

# Restart with rolled-back images
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

# Update deploy reference
echo "${TARGET_SHA}" > "$LAST_DEPLOY_FILE"

echo "[$(date)] Rollback to ${TARGET_SHA} complete."
echo ""
echo "NOTE: This is an image-level rollback. If the previous version had"
echo "different database migrations, you may need to handle that manually."
