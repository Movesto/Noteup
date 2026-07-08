# Deploying to Oracle Cloud + Cloudflare

This runs the whole app on one small VM with Docker, exposed to your domain
through a **Cloudflare Tunnel**. Because the tunnel dials *out* to Cloudflare,
**you never open any inbound ports** — which neatly avoids Oracle's notoriously
fussy firewall/security-list rules. Only the website is reachable; the database and
backend API never accept inbound connections, and monitoring uses outbound-only
agents (Netdata Cloud, Sentry) — nothing listens for inbound traffic.

```
browser ──HTTPS──> Cloudflare ──encrypted tunnel──> cloudflared ──> frontend ──> backend ──> postgres
```

> **Fast path:** steps 2–3 and the auto-deploy timer (step 6) are automated by
> `scripts/server-setup.sh`. Create the VM (step 1), clone the repo, run that script,
> then set your Cloudflare token in `.env`. The manual steps below explain what it does.

## 1. Create the VM

In the Oracle Cloud console → **Compute → Instances → Create**:
- **Image:** Ubuntu 22.04 (or 24.04).
- **Shape:** `VM.Standard.A1.Flex` (Ampere/ARM, Always-Free — pick e.g. 2 OCPU / 12 GB). ARM is fully supported; images build natively.
- Create/download an SSH key when prompted.

SSH in:  `ssh ubuntu@<vm-public-ip>`  (the public IP is only used for SSH; the
app itself doesn't need it.)

## 2. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker   # run docker without sudo
```

## 3. Get the code & set secrets

```bash
git clone https://github.com/Movesto/Noteup.git && cd Noteup
cp .env.prod.example .env
```

Edit `.env` and fill in real values (this file is gitignored — never commit it):

```bash
openssl rand -hex 32   # run twice, use for JWT_SECRET and SESSION_SECRET
```

- `DB_PASSWORD` – a strong password
- `JWT_SECRET`, `SESSION_SECRET` – the random strings above
- `CORS_ORIGINS` – `https://notesapp.uk`
- `CLOUDFLARE_TUNNEL_TOKEN` – from step 4
- `UNSPLASH_ACCESS_KEY` – optional (cover images)
- `NETDATA_CLAIM_TOKEN`, `NETDATA_CLAIM_ROOMS` – optional (Netdata Cloud monitoring; see §9)
- `SENTRY_DSN` – optional (error monitoring; see §9)

## 4. Create the Cloudflare Tunnel

In the Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**:
1. Choose **Cloudflared**, name it (e.g. `noteup`), **Save**.
2. On the install screen, **copy the token** (the long string after `--token`)
   and paste it into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`. (Ignore the install
   commands — our compose runs cloudflared for you.)
3. Open the **Public Hostname** tab → **Add a public hostname**:
   - **Domain:** `notesapp.uk` (leave Subdomain blank to use the root; or set e.g. `www`)
   - **Service Type:** `HTTP`
   - **URL:** `frontend:3000`
   - Save.

Cloudflare auto-creates the DNS record and handles HTTPS.

## 5. Launch

```bash
docker compose -f docker-compose.prod.yml up -d
```

Images are pre-built in CI and pulled from GHCR (no on-VM build), so the first run
just downloads them. Database migrations run automatically on backend startup.
Check it's healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f cloudflared   # should say "Registered tunnel connection"
```

Visit `https://notesapp.uk`. **The first account you register becomes the
owner** — register yours immediately.

Then turn on hands-off deploys → **§6** (skip it if `scripts/server-setup.sh` already
installed the timer, in which case this first launch was automatic too).

## 6. Updating (fully automatic)

Deploys are automatic and pull-based. A small **systemd timer** on the VM runs
`scripts/deploy.sh` every ~5 minutes; the script syncs the repo to `origin/main` and
applies it — **both code and compose changes** — using pre-built images from GHCR. No
inbound access, no manual steps.

So the whole workflow is: **edit → commit → `git push`** → live within ~5 minutes.

`scripts/server-setup.sh` installs the timer for you. To add it to an **existing** VM,
run once from the repo root:

```bash
chmod +x scripts/deploy.sh
sudo tee /etc/systemd/system/noteup-deploy.service >/dev/null <<EOF
[Unit]
Description=Noteup pull-based deploy
After=network-online.target docker.service
[Service]
Type=oneshot
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/scripts/deploy.sh
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
sudo systemctl daemon-reload && sudo systemctl enable --now noteup-deploy.timer
```

- **Watch a deploy:** `journalctl -u noteup-deploy.service -f`
- **Force one now:** `./scripts/deploy.sh`
- **Rollback:** it follows `origin/main`, so `git revert <bad-sha> && git push` — the VM
  rolls itself back on the next tick. (Images are also SHA-tagged in GHCR if you ever
  want to pin one manually.)

The only reason left to SSH in is to add a **brand-new secret** to `.env` (secrets are
never in git); after editing it, run `./scripts/deploy.sh`.

## 7. Backups

Your notes live in the `postgres_data` volume. Dump it regularly:

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U amor amor_db | gzip > backup-$(date +%F).sql.gz
```

Restore: `gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U amor -d amor_db`

## 8. Recommended Cloudflare hardening (dashboard)

- **SSL/TLS → Overview:** set encryption mode to **Full**.
- **SSL/TLS → Edge Certificates:** enable **Always Use HTTPS** and **HSTS**.
- **Security → WAF:** enable the Cloudflare Managed Ruleset.
- **Security → Bots:** turn on **Bot Fight Mode**.
- **Rate limiting:** add a rule on `/auth/*` (e.g. 10 requests/min per IP) to
  blunt brute-force login attempts.
- Optionally put the whole site behind **Cloudflare Access** (email login) while
  it's just you.

> Security headers (CSP/HSTS/etc.) are best added as Cloudflare **Transform
> Rules → Modify Response Header** so they apply at the edge without touching app code.

## 9. Monitoring

Three free, lightweight layers — nothing heavy enough to strain the VM:

- **Netdata — server + backend metrics.** The `netdata` service in
  `docker-compose.prod.yml` collects per-second host and per-container CPU/RAM/IO,
  and scrapes the backend's `/metrics` (FastAPI request rate, latency, error rate).
  Claim it to **Netdata Cloud** by setting `NETDATA_CLAIM_TOKEN` and
  `NETDATA_CLAIM_ROOMS` in `.env` (from Netdata Cloud → your Space → Connect Nodes);
  the agent reaches the cloud *outbound*, so no port is exposed. Configure alerts
  there (high CPU, swap, 5xx rate).
- **Sentry — application errors + traces.** Set `SENTRY_DSN` in `.env` and the
  backend reports exceptions and slow transactions with full stack context. Blank =
  disabled.
- **Cloudflare — real-user web vitals.** Dashboard → **Analytics & Logs → Web
  Analytics** for real page-load times / Core Web Vitals, and → **Traffic** to watch
  for **5xx / 524** responses (a 524 means a request exceeded Cloudflare's ~100 s edge
  limit — usually a heavy import).

For a quick ad-hoc look on the box: `docker stats --no-stream` (per-container
CPU/RAM) and `free -h` (RAM/swap; heavy swap = memory-starved, time to size up to the
free Ampere A1).

