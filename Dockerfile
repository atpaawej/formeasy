# syntax=docker/dockerfile:1

# formeasy — the production image.
#
# Four stages. `deps` installs once and is shared; `builder` produces Next's
# `standalone` output; `runner` ships only that output and runs it as a
# non-root user; `migrate` is the one-shot image that applies migrations before
# the app starts (docker-compose.yml uses it).
#
# Two things have to reach the build, and both are build arguments:
#
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  NEXT_PUBLIC_* is inlined into the client
#                                      bundle during `next build`, so a key
#                                      passed only at runtime is already too
#                                      late — Clerk would be broken in the
#                                      browser.
#   DATABASE_URL_POOLED                lib/db reads this at import time and
#                                      throws when it is missing. Nothing
#                                      connects: the pool is lazy and no page
#                                      queries the database at build time.
#
# Everything else is runtime configuration. See docs/self-hosting.md.

FROM node:22-alpine AS base
RUN npm install --global pnpm@12.11.2
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# A placeholder, because the build only ever checks that it is set. The real
# value arrives at runtime.
ARG DATABASE_URL_POOLED=postgres://build:build@localhost:5432/build
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    DATABASE_URL_POOLED=$DATABASE_URL_POOLED \
    NEXT_OUTPUT_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# `standalone` does not carry these two: Next expects a CDN to serve them, and
# the app serves them itself when the container is the whole deployment.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# Migrations need drizzle-kit and the schema, so this stage keeps the source and
# the dev dependencies. It is never shipped to production; it runs once.
FROM base AS migrate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "db:migrate"]
