# ADR — Two API faces (M2M v1 vs headless storefront)

## Status

Accepted.

## Context

be-BOP exposes (or will expose) more than one HTTP surface:

1. **Machine-to-machine** concentrator for external PoS / integrators (`/api/v1`).
2. **Headless storefront** session APIs for browser / customer apps (today-ish under `/api` with session Bearer — e.g. cart / account flows tracked under #2616).

Both may use an `Authorization: Bearer …` header. Naively merging auth models, money formats, CORS, or maintenance rules creates subtle security and product bugs.

## Decision

Keep **two faces** with explicit boundaries:

### Face A — Public HTTP API v1 (`/api/v1`)

- Audience: M2M integrators (PoS, ERP, sync jobs).
- Auth: **API keys only** (`Authorization: Bearer <api-key-secret>` **or** `X-Api-Key`). A Bearer token on `/api/v1` is **never** a user session — it is always an API key secret.
- Money: **`amountMinor`** integers (no client `currencySnapshot`).
- CORS: allowlist via admin runtime `apiV1.corsOrigins`, persisted in DB and never `*` on authenticated routes (no env fallback).
- Maintenance: only public meta stays up (`GET` health / openapi.json / docs + `OPTIONS`). Authenticated routes return **503 `MAINTENANCE`**. Catalog read is deferred to #2686 (no stub).

### Face B — Headless storefront (e.g. `/api` session Bearer)

- Audience: storefront / customer session clients.
- Auth: user/session Bearer (SSO / cookie / session token) — **not** interchangeable with Face A API keys.
- Contracts, envelopes, and money shapes may differ from Face A; do **not** reuse Face A middleware, scopes, or Zod DTOs by default.

## Consequences

- Document Face A scopes (`orders:write`, …) separately from storefront permissions. Catalog read is deferred to #2686.
- OpenAPI / Swagger under `/api/v1` describes Face A only.
- Future headless work (#2616 and friends) must not silently share Face A auth or amount conventions.
- Integrators reading `Authorization: Bearer` on `/api/v1` must send an API key secret; session tokens will 401.
