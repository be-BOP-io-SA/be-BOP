#!/usr/bin/env bash
# Production launcher for be-BOP.
#
# Invoke this from your supervisor (systemd ExecStart, pm2 start, docker
# entrypoint, etc.) instead of calling node directly. This indirection lets
# future be-BOP releases evolve their launch flags (--import, --enable-source-maps,
# new Node options, ...) without requiring a supervisor-side update.
#
# Environment variables (PORT, ORIGIN, BODY_SIZE_LIMIT, ADDRESS_HEADER, XFF_DEPTH,
# MONGODB_URL, ALLOW_ENV_OVERRIDE, ...) are passed through unchanged.

set -e

NODE_OPTS="--enable-source-maps"

# Pre-import shim for the ALLOW_ENV_OVERRIDE feature (admin-uploaded MongoDB
# switch from /admin/be-bop). The check makes this launcher tolerant of
# rollbacks to releases from before the shim existed.
if [ -f ./scripts/env-override-preimport.mjs ]; then
	NODE_OPTS="$NODE_OPTS --import ./scripts/env-override-preimport.mjs"
fi

exec node $NODE_OPTS build/index.js
