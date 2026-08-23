# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first, so a dependency-only change reuses the install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @budget/api... --filter @budget/shared

COPY packages/shared packages/shared
COPY apps/api apps/api
# shared must emit dist/ before the API's tsc build can resolve it
RUN pnpm --filter @budget/shared build && pnpm --filter @budget/api build
RUN pnpm --filter @budget/api --prod deploy --legacy /prod/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /prod/api /app
WORKDIR /app
EXPOSE 3000
# Render sets PORT; main.ts binds 0.0.0.0, which Render requires.
CMD ["node", "dist/main.js"]
