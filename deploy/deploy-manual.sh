#!/bin/bash
# Ręczny deploy: ./deploy/deploy-manual.sh [prod|staging]
ENVIRONMENT=${1:-staging}

if [[ "$ENVIRONMENT" != "prod" && "$ENVIRONMENT" != "staging" ]]; then
  echo "Użycie: $0 [prod|staging]"
  exit 1
fi

VPS_USER=deploy
VPS_HOST=TWOJ_IP_VPS   # <- zmień na IP swojego serwera

if [[ "$ENVIRONMENT" == "prod" ]]; then
  BRANCH=main
  COMPOSE_FILE=docker-compose.prod.yml
  ENV_FILE=.env.production
  echo "🚀 Deploying PRODUCTION..."
else
  BRANCH=develop
  COMPOSE_FILE=docker-compose.staging.yml
  ENV_FILE=.env.staging
  echo "🚀 Deploying STAGING..."
fi

ssh "$VPS_USER@$VPS_HOST" << EOF
  set -e
  cd /opt/ewrozka
  git fetch origin
  git checkout $BRANCH
  git pull origin $BRANCH
  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d --build --remove-orphans
  docker image prune -f
  echo "✅ Deploy $ENVIRONMENT zakończony!"
EOF
