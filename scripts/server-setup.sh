#!/usr/bin/env bash
# One-shot server prep for a fresh Ubuntu VM (e.g. Oracle Ampere A1).
#
# Installs Docker, adds a swap file, and scaffolds .env with generated secrets.
# Run from the repo root after cloning:
#
#   git clone https://github.com/Movesto/Noteup.git
#   cd Noteup
#   ./scripts/server-setup.sh
#
# Then paste your Cloudflare tunnel token into .env and launch (it tells you how).
set -euo pipefail

echo "==> Installing Docker (if needed)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "==> Installing fail2ban (blocks SSH brute-force; the VM's public IP is in git history)..."
if ! command -v fail2ban-server >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y fail2ban
  sudo systemctl enable --now fail2ban
fi

echo "==> Adding a 2G swap file (if none)..."
if ! sudo swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Scaffolding .env with generated secrets (if missing)..."
if [ ! -f .env ]; then
  cp .env.prod.example .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 16)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
  echo "    Created .env with DB_PASSWORD / JWT_SECRET / SESSION_SECRET filled in."
else
  echo "    .env already exists — leaving it untouched."
fi

echo "==> Installing the auto-deploy timer (git pull + compose up on a schedule)..."
REPO_DIR="$(pwd)"
chmod +x "$REPO_DIR/scripts/deploy.sh"
sudo tee /etc/systemd/system/noteup-deploy.service >/dev/null <<EOF
[Unit]
Description=Noteup pull-based deploy (sync main + docker compose up)
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/scripts/deploy.sh
EOF
sudo tee /etc/systemd/system/noteup-deploy.timer >/dev/null <<'EOF'
[Unit]
Description=Run the Noteup deploy every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Unit=noteup-deploy.service

[Install]
WantedBy=timers.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now noteup-deploy.timer
echo "    Timer installed — pushes to main now deploy automatically."

echo "==> Installing the tiered database-backup timers (incremental daily + full on Thursday)..."
chmod +x "$REPO_DIR/scripts/backup.sh"
# Retire the old single-tier units if a previous setup installed them.
sudo systemctl disable --now noteup-backup.timer 2>/dev/null || true
sudo rm -f /etc/systemd/system/noteup-backup.service /etc/systemd/system/noteup-backup.timer

# Templated service: %i is the mode (incremental | full).
sudo tee /etc/systemd/system/noteup-backup@.service >/dev/null <<EOF
[Unit]
Description=Noteup %i database backup (pg_dump + rotate + optional off-box copy)
After=docker.service

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/scripts/backup.sh %i
EOF

# Incremental: dense, short-retention — every day except Thursday.
sudo tee /etc/systemd/system/noteup-backup-incremental.timer >/dev/null <<'EOF'
[Unit]
Description=Noteup incremental backup (Sun-Wed, Fri-Sat)

[Timer]
OnCalendar=Sun,Mon,Tue,Wed,Fri,Sat *-*-* 03:30:00
Persistent=true
Unit=noteup-backup@incremental.service

[Install]
WantedBy=timers.target
EOF

# Full: weekly long-retention — every Thursday.
sudo tee /etc/systemd/system/noteup-backup-full.timer >/dev/null <<'EOF'
[Unit]
Description=Noteup full backup (every Thursday)

[Timer]
OnCalendar=Thu *-*-* 03:30:00
Persistent=true
Unit=noteup-backup@full.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now noteup-backup-incremental.timer noteup-backup-full.timer
echo "    Backup timers installed — incremental daily, full on Thursday."
echo "    Run now: ./scripts/backup.sh incremental   (or: ./scripts/backup.sh full)"

cat <<'NEXT'

==> Done. Almost nothing left:

  1) Paste your secrets:
       nano .env    # CLOUDFLARE_TUNNEL_TOKEN=...  (plus optional UNSPLASH_ACCESS_KEY,
                    #  SENTRY_DSN, NETDATA_CLAIM_TOKEN / NETDATA_CLAIM_ROOMS)

  2) The deploy timer brings the stack up within ~5 minutes. To go now instead:
       ./scripts/deploy.sh

  From here on, every push to main auto-deploys — no SSH needed for code or
  compose changes (only to add a brand-new secret to .env).

  If docker says "permission denied", run  newgrp docker  (or log out and back in) first.
NEXT
