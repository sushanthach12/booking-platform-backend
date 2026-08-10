# syntax=docker/dockerfile:1

# Stage 1: Build (the only stage that installs/compiles)
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm rebuild bcrypt msgpackr-extract

COPY . .
RUN pnpm run build

# Strip devDependencies so the runtime stage can reuse this node_modules as-is
RUN pnpm prune --prod

# Stage 2: Runtime (no install, no build)
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 8000

CMD ["node", "dist/src/main"]
