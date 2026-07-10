# ── Full deps (incl. dev) for building ───────────────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Build the Remix app ──────────────────────────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Production-only deps (no vite/tailwind/codegen) for a lean runtime ────────
FROM node:26-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY package.json ./
# Run as the unprivileged user shipped with the node image.
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
