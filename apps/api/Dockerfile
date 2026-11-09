FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/cli/package.json apps/cli/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
RUN pnpm --filter @reservalab/shared build && DATABASE_URL="postgresql://postgres:build-only@localhost:5432/reservalab?schema=public" pnpm --filter @reservalab/api db:generate && pnpm --filter @reservalab/api build
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed && pnpm start"]
