#!/usr/bin/env bash
# Pull-based deploy with a safety net. Syncs the repo to origin/main, pulls the
# latest images, applies them, then SMOKE-TESTS the backend. If the new build is
# unhealthy it rolls back to the previous images and pauses auto-deploys so a bad
# image can't flap the live site. No inbound access (outbound git + registry only).
#
# Pulls every run (CI builds the image minutes after the commit lands, so gating
# on the git SHA would miss the freshly-built image). `pull` is a cheap no-op when
# nothing changed; `up -d` only recreates containers whose image/config differs.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE=(docker compose -f docker-compose.prod.yml)
HOLD="$REPO_DIR/.deploy_hold"

# Load .env for optional DEPLOY_WEBHOOK (Discord/Slack-compatible {"content": ...}).
set -a; [ -f .env ] && . ./.env; set +a

notify() {
  [ -n "${DEPLOY_WEBHOOK:-}" ] && command -v curl >/dev/null 2>&1 || return 0
  curl -fsS -m 10 -H 'Content-Type: application/json' \
    -d "{\"content\": \"[noteup] $1\"}" "$DEPLOY_WEBHOOK" >/dev/null 2>&1 || true
}

# A previous deploy failed its health check — don't keep re-applying a bad image.
if [ -f "$HOLD" ]; then
  echo "==> Auto-deploy paused ($HOLD). After fixing: rm '$HOLD' && ./scripts/deploy.sh"
  exit 0
fi

# 1. Sync repo (compose file, scripts). Only resets when main actually moved.
git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "==> Syncing to $(git rev-parse --short origin/main)"
  git reset --hard origin/main
fi

# 2. Remember the running images so we can roll back if the new build is bad.
container_image() { docker inspect --format '{{.Image}}' "$("${COMPOSE[@]}" ps -q "$1" 2>/dev/null)" 2>/dev/null || true; }
prev_backend="$(container_image backend)"
prev_frontend="$(container_image frontend)"

# 3. Pull latest images and apply.
"${COMPOSE[@]}" pull --quiet
"${COMPOSE[@]}" up -d --remove-orphans

# 4. Smoke-test: the backend /health must answer within ~60s.
healthy=false
for _ in $(seq 1 12); do
  if "${COMPOSE[@]}" exec -T backend curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    healthy=true; break
  fi
  sleep 5
done

if [ "$healthy" = true ]; then
  docker image prune -f >/dev/null 2>&1 || true
  echo "==> Deploy healthy: $(git rev-parse --short HEAD)"
  exit 0
fi

# 5. Unhealthy → roll back to the previous images and pause auto-deploy.
echo "!! Smoke test failed — rolling back." >&2
[ -n "$prev_backend" ]  && docker tag "$prev_backend"  ghcr.io/movesto/noteup-backend:latest  || true
[ -n "$prev_frontend" ] && docker tag "$prev_frontend" ghcr.io/movesto/noteup-frontend:latest || true
"${COMPOSE[@]}" up -d --force-recreate backend frontend || true
: > "$HOLD"
notify "deploy FAILED health check → rolled back. Auto-deploy paused (rm .deploy_hold to resume)."
echo "!! Rolled back to the previous images. Auto-deploy paused via $HOLD." >&2
exit 1
