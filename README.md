# Noteup

A self-hosted "second brain" note app: a rich-text editor with `[[wiki-links]]`,
a knowledge graph, full-text search, Arabic writing support, and import from
Notion exports or PDFs.

- **Frontend** — Remix (React) + TipTap editor + Tailwind
- **Backend** — FastAPI + Strawberry GraphQL + SQLModel
- **Database** — PostgreSQL
- **Auth** — JWT + bcrypt, session in an httpOnly cookie

## Features

- Rich-text editor (headings, lists, tables, images, code, highlights)
- Arabic input: transliteration IME, automatic RTL, and a tashkeel (harakat) palette
- `[[wiki-links]]` with autocomplete, backlinks, and an interactive note graph
- Search with Arabic diacritic-insensitive matching
- Import: Notion `.zip` exports, and PDFs (extract text, OCR, or embed the whole file)
- Cover images via Unsplash (optional)

## Local development

Requires Docker. From the repo root:

```bash
docker compose up --build
```

- App: http://localhost:5173
- API: http://localhost:8000  (GraphQL at `/graphql`)
- Grafana: http://localhost:3000  ·  Prometheus: http://localhost:9090

The dev stack includes a monitoring suite (Prometheus/Grafana/Loki). Defaults
work out of the box; copy `.env.example` to `.env` to override them.

### Running tests

```bash
cd backend && python -m pytest -q          # backend
cd frontend && npx tsc --noEmit && npm run build   # frontend
```

## Deployment

Production runs on a single VM behind a Cloudflare Tunnel (no open ports), using
`docker-compose.prod.yml`. See **[DEPLOY.md](DEPLOY.md)** for the full Oracle
Cloud + Cloudflare walkthrough.

## Configuration

All secrets live in a gitignored `.env`. See `.env.example` (development) and
`.env.prod.example` (production) for the available variables.
