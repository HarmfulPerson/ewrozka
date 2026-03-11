# ── Stage 1: Prune monorepo do tylko tego co potrzebuje API ──────────────────
FROM node:20-alpine AS pruner
WORKDIR /app

RUN npm install -g pnpm@10 turbo@2

COPY . .
RUN turbo prune realworld-api --docker

# ── Stage 2: Instalacja zależności ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10

# Skopiuj package.json-y (bez kodu źródłowego)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

# ── Stage 3: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .

RUN pnpm build --filter=realworld-api

# ── Stage 4: Runner (minimalny obraz produkcyjny) ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Skopiuj tylko to co jest potrzebne do uruchomienia
COPY --from=builder /app/apps/realworld-api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/realworld-api/package.json ./package.json

# Katalog na przesłane pliki (nadpisywany przez volume)
RUN mkdir -p /app/uploads

EXPOSE 8001

CMD ["node", "dist/main.js"]
