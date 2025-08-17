# If behind a reverse proxy, set the following environment variables to get the correct IP address:
# - ADDRESS_HEADER=X-Forwarded-For 
# - XFF_DEPTH=1
FROM node:20 AS build

WORKDIR /app

COPY --link .git .git

# Compute last commit hash
RUN git rev-parse HEAD > /app/.git-commit-hash

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable pnpm

COPY --link --chown=1000 .npmrc .
COPY --link --chown=1000 package.json .
COPY --link --chown=1000 pnpm-lock.yaml .
COPY --link --chown=1000 patches patches

RUN pnpm install --frozen-lockfile

COPY --link --chown=1000 src src
COPY --link --chown=1000 assets assets
COPY --link --chown=1000 static static
COPY --link --chown=1000 docs docs
COPY --link --chown=1000 tsconfig.json *.config.js *.config.ts setup-env.sh .env .env.local ./

RUN chmod +x /app/setup-env.sh && /app/setup-env.sh

RUN PUBLIC_VERSION=$(cat ./.git-commit-hash) pnpm run build
RUN pnpm prune --prod

# Final stage
FROM node:20-slim
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app /app

EXPOSE 3000
CMD ["node", "--enable-source-maps", "build/index.js"]
