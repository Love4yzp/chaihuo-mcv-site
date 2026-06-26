FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate
WORKDIR /app

# ── Install dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile && pnpm store prune

# ── Build ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Production ──
FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
