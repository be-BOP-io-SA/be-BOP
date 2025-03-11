# If behind a reverse proxy, set the following environment variables to get the correct IP address:
# - ADDRESS_HEADER=X-Forwarded-For 
# - XFF_DEPTH=1
FROM node:20 AS build

WORKDIR /app

COPY --link .git .git

# Compute last commit hash
RUN git rev-parse HEAD > /app/.git-commit-hash

FROM node:20-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable pnpm

COPY --link --chown=1000 .npmrc .
COPY --link --chown=1000 package.json .
COPY --link --chown=1000 pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile

COPY --link --chown=1000 src src
COPY --link --chown=1000 assets assets
COPY --link --chown=1000 static static
COPY --link --chown=1000 tsconfig.json *.config.js *.config.ts entrypoint.sh .env ./

EXPOSE 3000

COPY --link --chown=1000 --from=build /app/.git-commit-hash /app/.git-commit-hash

RUN chmod +x /app/entrypoint.sh

CMD ["/bin/bash", "-c", "/app/entrypoint.sh"]
