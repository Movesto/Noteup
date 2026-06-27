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

cat <<'NEXT'

==> Done. Two steps left:

  1) Paste your Cloudflare tunnel token:
       nano .env       # set CLOUDFLARE_TUNNEL_TOKEN=...  (and optional UNSPLASH_ACCESS_KEY)

  2) Launch:
       docker compose -f docker-compose.prod.yml up -d --build

  If docker says "permission denied", run  newgrp docker  (or log out and back in) first.
NEXT
