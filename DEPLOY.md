# Deploying to Oracle Cloud + Cloudflare

This runs the whole app on one small VM with Docker, exposed to your domain
through a **Cloudflare Tunnel**. Because the tunnel dials *out* to Cloudflare,
**you never open any inbound ports** — which neatly avoids Oracle's notoriously
fussy firewall/security-list rules. Only the website is reachable; the database,
backend API, and metrics stay private inside the VM.

```
browser ──HTTPS──> Cloudflare ──encrypted tunnel──> cloudflared ──> frontend ──> backend ──> postgres
```

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
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes (the backend installs Tesseract for OCR).
Database migrations run automatically on backend startup. Check it's healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f cloudflared   # should say "Registered tunnel connection"
```

Visit `https://notesapp.uk`. **The first account you register becomes the
owner** — register yours immediately.

## 6. Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

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

## 9. Monitoring performance (no load on the VM)

The full Prometheus/Grafana stack is too heavy for a 1 GB VM, so monitoring is done
entirely through Cloudflare (free, zero server cost):

- **Web Analytics** — real page-load times and Core Web Vitals per page, so you can see
  *which* pages are slow for real visitors. Enable in the Cloudflare dashboard →
  **Analytics & Logs → Web Analytics → Add a site**, and (for this proxied/tunneled site)
  turn on **automatic setup** so Cloudflare injects the beacon for you. If automatic
  injection isn't offered, add the one-line beacon `<script>` it shows to
  `frontend/app/root.tsx` just before `<Scripts />` and redeploy.
- **Errors & timeouts** — Cloudflare dashboard → **Analytics & Logs → Traffic**: watch for
  **5xx / 524** responses. A spike in 524s means a request took longer than Cloudflare's
  100-second edge limit (usually a heavy loader/import) — the signal that something is slow
  server-side.
- **Live server resources (on demand)** — when diagnosing, SSH in and run
  `docker stats --no-stream` (per-container CPU/RAM) and `free -h` (RAM/swap). High swap
  use means the VM is memory-starved — the cue to move to the free Ampere A1.
ssh -i /home/cade/Downloads/ssh-key-2026-06-27.key ubuntu@146.235.195.209

