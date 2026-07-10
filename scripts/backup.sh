#!/usr/bin/env bash
# Tiered database backup: gzipped pg_dump snapshots in two tiers so recent history
# is dense and older history is sparse but long-lived. Driven by systemd timers:
#   backup.sh incremental   → Sun–Wed,Fri–Sat, kept ~14 days   (frequent, short-term)
#   backup.sh full          → every Thursday,   kept ~8 weeks   (weekly, long-term)
#
# Note: pg_dump produces a *logical, full* snapshot each run — it can't emit
# byte-level deltas. "incremental" here means the dense daily tier (short retention);
# the "full" tier is the same dump kept far longer. For true WAL-delta / point-in-time
# recovery you'd add WAL archiving — see DEPLOY.md §7. A "second brain" lives or dies
# by this — keep it working, and test a restore now and then.
set -euo pipefail

MODE="${1:-incremental}"   # incremental | full
case "$MODE" in incremental|full) ;; *) echo "usage: backup.sh [incremental|full]" >&2; exit 2;; esac

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Load DB creds + backup settings from .env (gitignored, lives only on the VM).
set -a; [ -f .env ] && . ./.env; set +a

DB_USER="${DB_USER:-amor}"
DB_NAME="${DB_NAME:-amor_db}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/noteup-backups}"       # off the git tree by default
if [ "$MODE" = full ]; then
  RETENTION_DAYS="${BACKUP_FULL_RETENTION_DAYS:-56}"
else
  RETENTION_DAYS="${BACKUP_INCREMENTAL_RETENTION_DAYS:-14}"
fi

DEST="$BACKUP_DIR/$MODE"
mkdir -p "$DEST"
FILE="$DEST/$MODE-$(date +%Y%m%d-%H%M%S).sql.gz"

echo "==> [$MODE] Dumping $DB_NAME -> $FILE"
# -T: no TTY (required under systemd). pipefail makes a failed pg_dump fail the run.
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

# Never let a truncated/near-empty dump silently become "the backup".
if [ "$(gzip -dc "$FILE" 2>/dev/null | wc -c)" -lt 100 ]; then
  echo "!! [$MODE] Backup looks empty — removing and failing." >&2
  rm -f "$FILE"
  exit 1
fi

# Optional off-box copy: an rclone remote (Cloudflare R2 / S3 / Drive / etc.).
# Set BACKUP_REMOTE=myremote:noteup-backups in .env after `rclone config`.
if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "==> [$MODE] Uploading to $BACKUP_REMOTE/$MODE"
  rclone copy "$FILE" "$BACKUP_REMOTE/$MODE"
fi

# Rotate this tier.
find "$DEST" -name "$MODE-*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "==> [$MODE] Done — $(ls "$DEST"/$MODE-*.sql.gz 2>/dev/null | wc -l) kept in $DEST."
