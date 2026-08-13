# API v1 — Orders write

External point-of-sale (PoS) systems can push orders into be-BOP through an authenticated HTTP API. be-BOP acts as a concentrator: each external PoS keeps its own order id and payment mean; be-BOP stores a canonical copy.

This document is the contract for POST /api/v1/orders. Implementation lands in stages (GitHub issue 2687):

| Lot | Scope                                              | Status target         |
| --- | -------------------------------------------------- | --------------------- |
| A   | Contract, Zod schemas, types                       | Done in this PR track |
| B   | API keys (hash, scripts, DB)                       | Done in this PR track |
| C   | Middleware, health, stub orders route (501)        | Done in this PR track |
| D   | Persistence, stock, paid sync, idempotence runtime | Done in this PR track |

See also [ADR: batch semantics](./adr-2687-batch-semantics.md), [architecture](./v1-architecture.md), and [ADR: two API faces](./adr-api-faces.md).

## Endpoint

Public URLs (routes under `src/routes/api/v1/**`, outside the `(app)` group; public path remains `/api/v1/...`):

- POST /api/v1/orders
- OPTIONS /api/v1/orders
- GET /api/v1/health
- GET /api/v1/openapi.json
- GET /api/v1/docs (Swagger UI)

Catalog read: `GET /api/v1/catalog/products` (scope `catalog:read`). Paid-order read: `GET /api/v1/orders/paid` (scope `orders:read`).

## Authentication

Provide one of:

- Authorization header with Bearer scheme and the API secret
- X-Api-Key header with the API secret

Secrets look like bebop*ak*{live|test}\_{base64url}. Keys are created and revoked in the admin UI (Settings → API Keys, super-admin only). Required scope for this endpoint: orders:write.

Machine-readable contract: GET /api/v1/openapi.json. Interactive viewer: GET /api/v1/docs (Swagger UI, CDN assets).

Keys are stored as SHA-256 of the secret alone (no server-side pepper). The secret is shown once at creation and never logged. Known risk: a DB leak enables offline brute-force of secrets — see architecture doc.

## CORS (D9)

Allowed origins come from **admin runtime config** `runtimeConfig.apiV1.corsOrigins` (Settings → API Keys, super-admin). Empty allowlist = no cross-origin access. Authenticated routes never use a wildcard `Access-Control-Allow-Origin`. OPTIONS returns 204.

The allowlist is stored in the database (`runtimeConfig.apiV1.corsOrigins`) and edited in Admin → API Keys. It is the single source of truth: no environment variable seeds or overrides it.

## Rate limiting

- IP safety net on `/api/v1/*` (hooks), envelope `RATE_LIMITED` + CORS.
  Excludes `GET /api/v1/health`, `GET /api/v1/openapi.json`, `GET /api/v1/docs` and `OPTIONS` so monitors / docs / CORS preflights are not starved.
- Per-key token bucket on POST `/api/v1/orders`: 60 requests / minute (`RATE_LIMITED` + CORS + `Retry-After: <remaining seconds>`).
- IP safety-net 429s also send `Retry-After: <remaining seconds>` (ceil of window left, minimum 1).

## Maintenance

When `runtimeConfig.isMaintenance` is true:

| Route                                | Behaviour                                              |
| ------------------------------------ | ------------------------------------------------------ |
| `GET /api/v1/health`                 | **200** (probes stay green)                            |
| `GET /api/v1/openapi.json`           | **200** (public read, like health)                     |
| `GET /api/v1/docs`                   | **200** (Swagger UI, like health)                      |
| `OPTIONS /api/v1/*`                  | **204** (CORS preflight)                               |
| `POST /api/v1/orders`                | **503** `MAINTENANCE` (+ CORS when Origin allowlisted) |
| Other authenticated `/api/v1` routes | **503** `MAINTENANCE` — **not** a public exemption     |

Rate limiting remains in-process memory only (no Redis).

## Request body

Example JSON shape:

- orders: array of order commands
- each order: externalOrderId, currency, optional createdAt, items[], payment, optional customFields
- each item: productId, quantity, optional customPrice { amountMinor, currency }
- payment / payments[]: method point-of-sale, status, amountMinor, currency, optional posLabel, **strongly recommended `externalPaymentId` on every payment** (safe PoS retries, reordered `payments[]`, split/add matching)

### Rules (Zod-enforced)

| Rule             | Detail                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Batch size       | orders length 1-100                                                                                                                          |
| externalOrderId  | Required, non-empty string (idempotence key with the API key — D2)                                                                           |
| currencySnapshot | Rejected anywhere in the payload (D4). be-BOP computes snapshots itself                                                                      |
| Amounts          | Minor units integers (amountMinor) — D4                                                                                                      |
| payment.method   | v1: point-of-sale only — D5                                                                                                                  |
| Items            | At least one item; productId + quantity (>= 1) required                                                                                      |
| customPrice      | Optional per line; authoritative over catalogue price (D8, lot D). `customPrice.currency` and `payment.currency` must equal `order.currency` |
| customFields     | Optional map; ≤ 50 keys; each key ≤ 100 chars                                                                                                |
| createdAt        | Optional ISO datetime; rejected if outside ±365 days from server now (`VALIDATION_ERROR`)                                                    |

## Response (D1 — frozen)

HTTP status is 200 for a successfully authenticated and validated batch that was processed (including partial warnings). There is no 207. Global envelope fields: ok, status (ok | ok_with_warnings | ok_with_errors), results[].

| Global status    | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| ok               | Every command succeeded without warnings                |
| ok_with_warnings | At least one warning (e.g. PRODUCT_MISSING)             |
| ok_with_errors   | At least one command failed (others may have succeeded) |

### Per-command status

| Status    | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| created   | New order persisted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| duplicate | Same (externalSourceApiKeyId, externalOrderId) already exists (D3). Payment side-effects follow admin confirm/cancel domain helpers (`onOrderPayment` / `onOrderPaymentFailed`) for each still-pending order payment matched to the payload (see matching rules); otherwise no-op. Items/amounts/labels are not re-applied. If payment sync throws a known domain error after the key already exists, status stays **`duplicate`** with optional `PAYMENT_SYNC_FAILED` warning (does not 500 the batch). |
| failed    | Command rejected (e.g. stock fail in lot D — D6)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Warning codes

| Code                | Meaning                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRODUCT_MISSING     | Product id unknown / deleted — order still created with stub + catalog-integrity-warning label                                                                          |
| AMOUNT_MISMATCH     | `payment.amountMinor` differs from order total computed from lines (truth = lines; not a fail)                                                                          |
| POS_LABEL_UNKNOWN   | `payment.posLabel` did not match a `posPaymentSubtypes.slug` (order still created)                                                                                      |
| PAYMENT_SYNC_FAILED | Payment settle/sync threw a domain error after the order row exists (create or duplicate) — status stays `created`/`duplicate` with `orderId`; see `details.domainCode` |

## Error envelope (non-200)

Shape: { error: { code, message, details? } }

| HTTP | error.code                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------- |
| 400  | VALIDATION_ERROR                                                                                          |
| 401  | UNAUTHORIZED                                                                                              |
| 403  | FORBIDDEN                                                                                                 |
| 429  | RATE_LIMITED                                                                                              |
| 503  | MAINTENANCE (all authenticated `/api/v1` routes; only health / openapi.json / docs GET + OPTIONS stay up) |
| 500  | INTERNAL_ERROR                                                                                            |

## Idempotence (D2)

Unique sparse index on (externalSourceApiKeyId, externalOrderId), set **atomically at insert** inside `createOrder` (not a post-create `$set`). Replays return status "duplicate" with the existing be-BOP orderId (D3). Duplicate payment side-effects reuse the same domain functions as admin order payment confirm/cancel (`onOrderPayment` / `onOrderPaymentFailed` / `cancelPayment`): pending→paid, pending→canceled|failed|expired; already non-pending or client `pending` → no-op. Face A accepts `payment` or `payments[]` and matches each payload payment to an unused `order.payments` row (see Payment sync matching below).

## Decisions D1-D10

| Id  | Decision                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | HTTP 200 + per-command report. Missing products to created + PRODUCT_MISSING. Global ok_with_warnings when warnings present. No 207.                                                               |
| D2  | Idempotence unique sparse (externalSourceApiKeyId, externalOrderId).                                                                                                                               |
| D3  | Duplicate returns the existing `orderId`. Payment side-effects follow admin confirm/cancel domain helpers (`onOrderPayment` / `onOrderPaymentFailed`). Items/amounts are not mutated on duplicate. |
| D4  | Amounts in minor units; no client currencySnapshot.                                                                                                                                                |
| D5  | payment.method v1 = point-of-sale only.                                                                                                                                                            |
| D6  | Stock failure fails the command (`failed` + `STOCK_UNAVAILABLE`).                                                                                                                                  |
| D7  | Paid / terminal statuses applied synchronously via the same domain helpers as admin (`onOrderPayment` / `onOrderPaymentFailed`) when the existing payment is still pending.                        |
| D8  | customPrice takes priority over catalogue price.                                                                                                                                                   |
| D9  | CORS allowlist via admin `apiV1.corsOrigins`, stored in DB with no env fallback, never wildcard on auth routes.                                                                                    |
| D10 | **Lifted:** admin UI for API keys (super-admin) + OpenAPI (`/api/v1/openapi.json`) + Swagger UI (`/api/v1/docs`). Scripts remain available.                                                        |

## Runtime behaviour (lot D)

- Orchestration lives in `src/lib/server/api/v1/orders/*` (`writeBatch` / `writeOne`); `+server.ts` only auth / rate-limit / Zod / JSON.
- POS semantics: `onLocation: true`, `shippingAddress: null`, `user.sessionId = api-v1:{apiKeyId}`, `userHasPosOptions: true`.
- **D11:** Face A PoS orders are on-location. `createOrder` does **not** require a shipping address when `onLocation` is true, even if catalog products have `shipping: true` (pickup / deliveryless for address purposes). Delivery fees stay zero unless a shipping address is explicitly provided.
- Missing products: stub `shipping:false`, name `Missing product {id}`, price `customPrice || 0`, warning + label `catalog-integrity-warning` (create-if-missing).
- Idempotence: unique sparse `(externalSourceApiKeyId, externalOrderId)` written **atomically in the `createOrder` insert** (with optional client `createdAt`); unique violation / existing row → `duplicate` (may still apply pending payment transitions via `syncExternalPayment` using admin domain helpers).
- Optional client `createdAt` passed into `createOrder` at insert (Zod rejects values outside ±365 days).
- `customFields` → `CollectedCheckoutField` type `free`, `fieldId = api:{slug}` (≤ 50 keys, key ≤ 100).
- `posLabel` → lookup `posPaymentSubtypes.slug`; unknown → `POS_LABEL_UNKNOWN` warning.
- E-shop gates (`runtimeConfig.isBillingAddressMandatory`, `collectIPOnDeliverylessOrders`) still apply inside `createOrder` for the API channel → per-command `failed` with `DOMAIN_ERROR` (no special Face A bypass for those gates). Shipping-address requirement is skipped for `onLocation` (D11), separately from these gates.
- Channel: Face A uses dedicated `channel: 'api'` + **`skipAutoDiscounts: true`** (PoS-priced totals; no shop auto-discount rewrite).
- Payments: accept singular `payment` **or** `payments[]` (max 50; `payments` wins if both set). Mono path keeps `createOrder` + first payment row; multi creates a bare order then `addOrderPayment` per row (admin-style splits; remaining amount accounts for prior pending rows).
- Payment sync matching (duplicate / settle):
  1. `externalPaymentId` when present on both sides (**strongly recommended on every payment** for integrators; max 200 chars — safe PoS retries / reorder / splits)
  2. else unused order payment with same `(amountMinor + currency + method)`
  3. else same index if still unused — only when payload has no externalPaymentId (legacy)
     Never apply two payload payments to the same order payment. Mono singular `payment` is treated as a one-element list.
- Extra payload payments on duplicate with a **new** `externalPaymentId`: `addOrderPayment` when the order is still `pending` and remaining amount allows (admin-style); otherwise ignored (no item mutation). Extra payments without a new id are ignored. Guard rejections from `addOrderPayment` on duplicate are logged server-side and ignored (no hard fail).
- On create, `externalPaymentId` is persisted on the payment row when provided.
- Settle errors after the order row exists (create or duplicate): domain failures from `onOrderPayment` / `onOrderPaymentFailed` / `addOrderPayment` / multi `ensureMultiPayments` during sync are caught per command → `created`/`duplicate` + `PAYMENT_SYNC_FAILED` warning (idempotency key succeeded; client can retry safely). Unexpected throws are isolated in `writeBatch` so other orders in the batch still return 200 + `results[]`.
- Zero-total paid: uses domain `free` / `addOrderPayment('free')` → `onOrderPayment` (webhooks/accounting), never a raw `$set status: paid`.

## Manual test examples

1. Health: GET {ORIGIN}/api/v1/health
2. Create key in admin Settings → API Keys
3. POST {ORIGIN}/api/v1/orders with the API secret and a valid batch JSON (HTTP 200 + `results[]`)
4. Revoke in admin Settings → API Keys
