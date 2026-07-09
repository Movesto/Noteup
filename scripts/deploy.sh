#!/usr/bin/env bash
# Pull-based deploy. Syncs the repo to origin/main and applies it — code AND
# compose changes — with no inbound access (only outbound git + registry pulls).
#
# Run on a timer (see scripts/systemd/ installed by server-setup.sh). Idempotent:
# it only acts when main actually moved, and records success only after a healthy
# `up -d`, so a failed run (e.g. image still building) simply retries next tick.
set -euo pipefail

# Repo root, regardless of where it was cloned or which user runs this.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE=(docker compose -f docker-compose.prod.yml)
STAMP="$REPO_DIR/.last_deployed"   # untracked; survives `git reset --hard`

git fetch --quiet origin main
TARGET="$(git rev-parse origin/main)"
LAST="$(cat "$STAMP" 2>/dev/null || echo none)"

changed=false
if [ "$TARGET" != "$LAST" ]; then
  echo "==> New commit $LAST -> $TARGET"
  git reset --hard origin/main
  "${COMPOSE[@]}" pull
  changed=true
fi

# Always converge the running stack to the compose file. When the commit changed
# this applies the new images; it also picks up any .env edits and restarts stopped
# containers (self-healing). It's a no-op when nothing has changed.
"${COMPOSE[@]}" up -d --remove-orphans

if [ "$changed" = true ]; then
  echo "$TARGET" > "$STAMP"   # only marked after a successful deploy (set -e)
  docker image prune -f >/dev/null 2>&1 || true
  echo "==> Deployed $TARGET"
fi
