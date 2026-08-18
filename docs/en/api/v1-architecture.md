# be-BOP Public HTTP API v1 — Architecture

Target for issue #2687 (Lots A–D). Elegant, scalable, aligned with existing be-BOP domain code.

Two HTTP faces (M2M `/api/v1` vs headless storefront): see [ADR: two API faces](./adr-api-faces.md).

## Goals

- Machine-to-machine PoS → be-BOP concentrator
- Clear boundaries: HTTP adapter ≠ application ≠ domain ≠ infra
- Stateless API surface (no session); horizontal scale of app nodes with documented in-process rate-limit caveat
- Reuse `createOrder` / `onOrderPayment` (no second pricing engine)
- Testable: pure units + real Mongo integration (`bootik-test`)

## Layering

```
┌─────────────────────────────────────────────────────────┐
│  Transport — SvelteKit `src/routes/api/v1/**/+server.ts` │
│  Parse HTTP, call use-cases, map Result → status/JSON    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Cross-cutting — `lib/server/api/v1/{handler,middleware,  │
│  auth,cors,errors}`                                      │
│  CORS, maintenance (auth routes 503), auth, rate-limit, envelope│
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Application — `lib/server/api/v1/orders/*`              │
│  writeBatch / writeOne / resolveProducts / mappers       │
│  Orchestrates domain; returns typed batch results        │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Domain (existing) — `lib/server/orders.ts`, cart, labels│
│  createOrder, addOrderPayment, onOrderPayment            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Infrastructure                                          │
│  Mongo collections · in-process rateLimit                │
│  env-config · key-crypto                                 │
└─────────────────────────────────────────────────────────┘
```

### Rules

1. **`+server.ts` is boring** — auth scope, rate-limit key, `safeParse`, `writeBatch()`, `json()`. No product/stock/payment logic.
2. **One use-case module per resource action** — e.g. `orders/writeBatch.ts`. Future catalog read (#2686) can add a use-case module without touching hooks — no stub route today.
3. **Domain stays canonical** — API adapts inbound DTOs to domain types; never fork VAT/FX/stock rules.
4. **Errors are data** — per-order `failed` inside HTTP 200 batch; transport errors use `{ error: { code, message, details? } }`.

## Rate limiting

Keep the existing **in-process** `rateLimit(bucketId, key, max, duration)` (Map, IPv6 /64 for IPs).

- No Redis (out of scope for this issue / explicit product decision).
- Document multi-process limitation (each Node process has its own counters) — same as the rest of be-BOP today.
- Per-API-key limit on `POST /orders` + IP safety net on `/api/v1` (health / openapi.json / docs GET + OPTIONS excluded from IP bucket).
- `429 RATE_LIMITED` responses include `Retry-After: <seconds>` = **ceil remaining window** until the oldest hit ages out (minimum 1). Keyed by API key id on write; IP safety net is separate. Still in-process Map (no Redis).

## Maintenance policy

| Route                                | During `runtimeConfig.isMaintenance`           |
| ------------------------------------ | ---------------------------------------------- |
| `GET /api/v1/health`                 | **200** (probes stay green)                    |
| `GET /api/v1/openapi.json`           | **200** (public read)                          |
| `GET /api/v1/docs`                   | **200** (Swagger UI)                           |
| `OPTIONS /api/v1/*`                  | **204** (CORS preflight)                       |
| `POST /api/v1/orders`                | **503** `MAINTENANCE`                          |
| Other authenticated `/api/v1` routes | **503** `MAINTENANCE` — not a public exemption |

Only health / openapi.json / docs stay up. Authenticated GETs are **not** exempt.

## Batch write flow (#2687 D)

```
POST /orders
  → authenticate (orders:write)
  → rateLimit(apiKeyId)
  → zod OrdersWriteRequest
  → writeBatch({ apiKey, orders, clientIp })
       for each order:
         writeOne → existing? settleExistingOrder (admin-parity payment sync)
                    | else resolve products | createOrder (atomic external ids)
                    | labels | syncExternalPayment (onOrderPayment / onOrderPaymentFailed)
                    | map errors → created | duplicate | failed + warnings
  → HTTP 200 { ok, status, results }
```

Idempotency: unique sparse `(externalSourceApiKeyId, externalOrderId)` set atomically in the `createOrder` insert.
`duplicate` is not always read-only (D3): payment side-effects follow admin confirm/cancel domain helpers
(`onOrderPayment` / `onOrderPaymentFailed` / `cancelPayment`) for each still-pending payment matched to the payload (`payment` or `payments[]`) via `externalPaymentId`, else amount+method, else unused index (legacy, no externalPaymentId).

**Channel:** Face A calls `createOrder` with dedicated `channel: 'api'` (DiscountChannel) and **`skipAutoDiscounts: true`** so shop percentage discounts never rewrite PoS-priced line totals — even if a discount explicitly targets `api`.

## Package layout (Lot D)

```
src/routes/api/v1/
  health/+server.ts
  openapi.json/+server.ts
  docs/+server.ts
  orders/+server.ts
src/routes/(app)/admin.../api-keys/   # list / new / [id] revoke (superAdminOnly)
src/lib/server/api/
  keys.ts
  key-crypto.ts
  v1/
    handler.ts
    middleware.ts
    auth.ts
    cors.ts
    errors.ts
    openapi.ts
    validators.ts              # ETag / If-Match helpers (not wired to writes yet)
    schemas/orders-write.ts
    orders/
      writeBatch.ts
      writeOne.ts
      resolveProducts.ts
      mapCustomFields.ts
      ensureCatalogIntegrityLabel.ts
      money.ts
      mapErrors.ts
src/lib/types/ApiV1.ts
src/lib/types/ApiKey.ts
```

## CORS

- Source of truth: `runtimeConfig.apiV1.corsOrigins` (admin Settings → API Keys, super-admin).
- Empty allowlist denies all browser cross-origin access; never `*`.
- No env var: the allowlist is DB-only. There is no process-start bootstrap and no fallback.

## API key storage

- Secrets are never stored; Mongo holds `keyHash = SHA-256(secret)` (hex) plus a non-secret `keyPrefix`.
- **No pepper / per-key salt** for now (product decision). Residual risk / tech debt: a database leak enables offline brute-force of API key secrets. Revisit with a server-side pepper or slow KDF + per-key salt before treating keys as long-lived high-value credentials.
- One-shot admin reveal flash cookies are HMAC-signed with a key derived from **`runtimeConfig.authLinkJwtSigningKey`** (purpose string `bebop-api-key-reveal-v1`) — same app-secret pattern as magic-link JWTs; no `MONGODB_URL` derivation and no dedicated pepper env var.

## Scalability notes

- **Stateless app nodes** — session skipped on `/api/v1`; API keys in Mongo
- **Rate limits** — in-process (document multi-instance caveat; no Redis)
- **Batch over chatty APIs** — 1–100 orders/request
- **Idempotent retries** — safe PoS replays
- **Versioned surface** — `/api/v1` only; breaking changes → `/api/v2`
- **Future read APIs** — catalog read deferred to #2686 (same middleware/auth/RL ports when it lands; no stub route today)
- **Two faces** — Face A `/api/v1` (API keys) must not be merged with Face B storefront session Bearer ([ADR](./adr-api-faces.md))

## Conditional requests / ETag (#2713)

Helpers live in `src/lib/server/api/v1/validators.ts` (`buildStrongETag`, `parseIfMatch`, `parseIfNoneMatch`, match helpers) for RFC 9110-style strong validators.

- **Not wired** to `POST /api/v1/orders` (batch write has its own idempotency key; no ETag precondition).
- Intended for future **GET** catalog / orders read routes (#2713 and follow-ups): opaque strong ETags + `If-None-Match` / `If-Match` preconditions.

## Testing strategy

| Layer                     | How                                                                 |
| ------------------------- | ------------------------------------------------------------------- |
| Schemas / mappers / money | Vitest pure                                                         |
| rateLimit                 | Existing unit tests (memory Map)                                    |
| writeBatch / writeOne     | Mongo integration on `bootik-test` + replica set (`cleanDb`, seeds) |
| HTTP adapter              | Light tests with mocked use-case or thin integration                |

## Non-goals (this tranche)

- Redis / distributed rate-limit store
- GraphQL / #2616 full headless cart (Face B — keep separate from Face A)
- [Wiring ETag validators to write routes](#conditional-requests--etag-2713) (explicit non-goal; see #2713 for reads)
- Replacing `createOrder` internals
- Force-stock / upsert semantics
- Heavy OpenAPI codegen deps (hand-maintained `openapi.ts` + CDN Swagger UI instead)
