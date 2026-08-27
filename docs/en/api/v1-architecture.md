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
2. **One use-case module per resource action** — e.g. `orders/writeBatch.ts`, `catalog/listProducts.ts`, `orders/listPaid.ts`.
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
    validators.ts              # ETag / If-Match helpers (wired to GET reads, never to writes)
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
- **Read APIs** — `GET /api/v1/catalog/products` (`catalog:read`) and `GET /api/v1/orders/paid` (`orders:read`) share Face A middleware/auth/rate-limit. Both answer conditional GETs (`ETag` / `If-None-Match` → `304`).
- **Two faces** — Face A `/api/v1` (API keys) must not be merged with Face B storefront session Bearer ([ADR](./adr-api-faces.md))

## Conditional requests / ETag (#2713)

Helpers live in `src/lib/server/api/v1/validators.ts` (`buildStrongETag`, `parseIfMatch`, `parseIfNoneMatch`, match helpers) for RFC 9110-style strong validators. `jsonWithETag(body, request)` is the single entry point used by the read routes.

- **Wired** to every Face A read: `GET /api/v1/catalog/products`, `GET /api/v1/catalog/products/{id}`, `GET /api/v1/orders/paid`.
  - The validator is an opaque strong ETag — SHA-256 of the exact serialized JSON body, so it changes iff the representation changes. CORS headers are added afterwards and never feed it.
  - `If-None-Match` uses weak comparison (`*` and `W/` accepted, per §13.1.2); a match short-circuits to a bodyless `304` repeating the same `ETag`.
  - Responses carry `Cache-Control: private, no-cache`: per-API-key payloads stay out of shared caches, while clients can still store and revalidate.
  - Cross-origin callers need the header plumbing in `cors.ts` — `If-None-Match` in `Access-Control-Allow-Headers`, `ETag` in `Access-Control-Expose-Headers`.
  - Value for a PoS polling `/orders/paid` on a short interval: unchanged pages cost a `304` with no body.
- **Not wired** to `POST /api/v1/orders` (batch write has its own `(apiKeyId, externalOrderId)` idempotency key; no ETag precondition, no `If-Match`).
- `ifMatchSatisfied` / `parseIfMatch` stay available but unused: no Face A route accepts a write precondition today.

## Product pictures — links into be-BOP, in every generated size

`CatalogProduct.picture` is `{ url, width, height, formats }` and appears on all three catalog reads: the list, the single product, and the PoS catalog. `GET /api/v1/catalog/products/{id}/picture` returns the same object on its own, in JSON, for a caller that wants one product's sizes without re-reading a page.

The links point at **`/api/v1/catalog/products/{id}/picture/{width}`**. The storefront serves the same objects from `/picture/raw`, but that route lives in the `(app)` group, which headless mode gates or bypasses (#2616) — an API linking there would break in exactly the mode it exists for. The serving itself is shared (`serve-picture.ts`): both handle either S3 deployment, bytes streamed through be-BOP when `S3_PROXY_DOWNLOADS` is on and a redirect to a signed link otherwise. Only the mount point and the addressing differ, the API's being by product so a link survives the shop replacing the image.

Never a direct object-storage link. A presigned S3 URL proves the caller is _authorized_; it proves nothing about _reachability_, and be-BOP is routinely deployed with S3 on a private address — `.env` documents `S3_ENDPOINT_URL` as possibly `http://127.0.0.1:9000`, and a compose setup usually names the service `minio`. Both presign perfectly and are dead links for a till.

- **`url` is the lowest resolution be-BOP generated** — what a register renders by default.
- **`formats` lists every size**, smallest first, each a full link. A caller with a real screen picks one instead of upscaling a thumbnail.
- **Upload produces a webp per step of 2048/1024/512/256/128 the source exceeds**, plus a full-size webp when the source is already under 2048. A small source therefore yields a single format, so `formats` can legitimately hold one entry.
- **A product with several pictures contributes its first**, on the same `order` / `createdAt` ranking the PoS uses, so the till and the storefront show the same image.
- **`picture` is optional**: absent when the product has no picture, or none with a usable format.
- **The catalog moves no bytes.** It advertises where the images live; a page costs one Mongo query and no S3 traffic at all. Bytes move when, and only when, a caller follows a link.
- **Links are stable**, which is what lets the catalog's ETag work: nothing in them is derived from the moment of the request.

One schema (`CatalogPicture`) serves both surfaces. `/api/v1` and the PoS seam disagree about amounts and identifiers, not about where an image lives.

### Who may fetch an image

**Unauthenticated on both routes.** A custom storefront renders these in a browser, and a key would break every plain `<img src>`.

Access is bounded by **product visibility** instead: a picture attached to a product is served only when that product is one the catalog would name. Everything else — the shop logo, tag and slider art, galleries, schedule images — has no product to check and is public by nature.

The check lives in the shared `serve-picture.ts`, so it applies to both routes. Without it an unpublished product's images would be reachable by id alone — not guessable, but not access-controlled either, which is not the same thing.

### The trade this accepts

When `S3_PROXY_DOWNLOADS` is off, both routes redirect to a presigned bucket URL, so in that deployment the caller does need a path to the bucket — exactly as the storefront's own browsers already do. That is the shop's existing decision about how it serves images, not a new one taken here. A deployment where the caller cannot reach the bucket sets `S3_PROXY_DOWNLOADS=true`, which is what that flag is for.

## VAT

Catalog prices are stored and published **excluding VAT**; `amountPaid` on an order is what was **received**, VAT included. Both say so, and both carry the rate — without it a caller showing a catalog price shows a price no customer pays.

be-BOP's own PoS does not have that problem because it resolves the rate itself: `computeVatRate` (`$lib/utils/vat`) takes the product's VAT profile, the profile table, the shop country and the single-country flag, and the touch UI applies it in the browser. None of those inputs is published, so an external register cannot reproduce it.

So the API resolves and publishes the result rather than the machinery:

- **`CatalogProduct.vatRate` / `PosCatalogProduct.vatRate`** — the rate as a percentage, resolved server-side. `price` excludes it; what a customer pays is `price × (1 + vatRate / 100)`. Shipping profiles and country config to every integrator would mean each reimplementing `computeVatRate`, and one of them eventually computing it differently from be-BOP.
- **Always the shop's country.** A register sells on the premises, so the buyer's country never enters — `vatSingleCountry` is assumed, not read. A shop trading VAT-free publishes 0 everywhere.
- **The profile table is read once per page**, and only when at least one product on it carries a profile; the country default covers the rest.
- **`PaidOrder.vat` and `PosPaidOrderEvent.vat`** — the VAT contained in the amount received, one entry per rate. Read from the snapshot `order.vat` (rates) and `currencySnapshot.main.vat` (amounts) take at payment time, index-aligned, never recomputed: a rate that changed since is not the rate that was charged. A rate whose amount is missing is dropped rather than reported at zero.

That last point is what #2695 needs: the Z-ticket signs perpetual per-rate totals into an append-only chain, so the figures it consumes have to be the ones charged, not the ones a current rate would produce.

## Two surfaces under /api/v1

`/api/v1/*` is be-BOP's general machine API. `/api/v1/pos/*` is its point-of-sale surface, for a register or any system selling on be-BOP's behalf — a domain surface, like the catalog one, not a surface per integration.

They differ in vocabulary, not in machinery:

|                 | `/api/v1`                              | `/api/v1/pos`                                    |
| --------------- | -------------------------------------- | ------------------------------------------------ |
| Amounts         | `amountMinor`, integer                 | be-BOP `Price`, major units                      |
| Product key     | `id` + `alias[]`                       | `slug` (which _is_ the be-BOP product `_id`)     |
| Order reference | `externalOrderId`                      | `saleRef`                                        |
| Catalog         | paginated envelope, `?lang=`           | whole document, default language                 |
| SSE `id:`       | opaque resume cursor                   | the order id                                     |
| SSE resume      | strict — an unknown validator is a 400 | advisory — an unknown id starts at the live edge |

Making one surface serve both would force one of the two to bend, and the one that would bend is whichever has a live consumer. So the seam gets its own DTOs (`$lib/types/ApiV1Pos`) and its own mappers (`api/v1/pos/`), and everything underneath is shared: the same key store, the same rate limiter, the same change-stream hub, the same picture pipeline, the same `writeBatch`.

### Scopes

Two axes, neither implying the other: `pos:*` for the seam, `*:stream` for holding a connection open.

|         | poll / read                   | stream          | write          |
| ------- | ----------------------------- | --------------- | -------------- |
| general | `orders:read`, `catalog:read` | `orders:stream` | `orders:write` |
| seam    | `pos:read`                    | `pos:stream`    | `pos:write`    |

Streaming is separated from reading because it is a different privilege: an SSE connection occupies a connection slot and a share of the change stream for as long as it lasts, where a poll costs one query. A credential that may read is not automatically one that may camp on the server.

The seam / general split is the other axis. The general `orders:read` returns every order including unpaid ones, with their full lines — far more than a register needs to reconcile its own sales, and not something a device sitting on a festival counter should hold. A key issued with `pos:read` + `pos:write` unlocks exactly the three seam operations and nothing else, which is what makes the seam's "every request is implicitly scoped by the credential" true rather than aspirational. The admin key form groups scopes by prefix, so `pos` shows up as its own block with no extra wiring.

### Where the seam and be-BOP disagree

The seam is the contract, but it was written against assumptions be-BOP does not hold. Three deliberate departures, all additive or omitted so a conformant consumer is unaffected:

- **`PosCatalogProduct.tagIds` and the response-level `tags` dictionary are additions.** See below — this is the returnables answer, not a cosmetic one.
- **No price on the catalog.** A register sends `PosSaleItem.price` at sale time, so it holds its own; publishing be-BOP's alongside would be two sources of truth for the same number.
- **`method` maps onto be-BOP's two-level payment model.** be-BOP splits an axis (`point-of-sale`) from a subtype resolved against the shop's configured `posPaymentSubtypes`; the seam flattens both into one `method` field. That value becomes the subtype, so a shop that has not configured it gets a `POS_LABEL_UNKNOWN` warning per sale rather than a silent mislabel.
- **`externalOrderId` rather than the seam's `saleRef`.** Same field, be-BOP's name, and it lands directly on the `(apiKeyId, externalOrderId)` uniqueness the general API already enforces.
- **`soldAt` is bounded on the future only**, at 24 hours. The general API rejects a `createdAt` more than a year either way; here the past must stay open, because a till backlog is a legitimate reason to ingest a very old sale and a symmetric bound would reject the whole batch. The future is bounded because a sale ahead of now is always a bug, and #2695 makes it an expensive one: the Z-ticket carries perpetual per-rate totals in a signed append-only chain, so a sale filed under the wrong day cannot be corrected, only appended to. 24 hours absorbs any timezone misconfiguration (at most 14 hours, the largest offset in use) and any daylight-saving shift — at the cost of still allowing one day boundary to be crossed.
- **`returnable` is not emitted, and is not planned.** Returnables go through tags; the seam's `{ productSlug, policy }` is a competing model that be-BOP does not adopt. See below.
- **Currency is not pinned to CHF.** The seam's enum has one member because that is the deployment it was written for. Accepting every be-BOP currency is a superset: a conformant client only ever sends CHF, while a shop running in another currency is not locked out of its own till.

### Returnables go through tags. Decided.

The seam models returnables as `CatalogProduct.returnable = { productSlug, policy }` — a per-product pointer at the deposit item, named to avoid be-BOP's existing `Product.deposit` (down-payment). be-BOP does not take that route. **Returnables are driven by a tag widget, and tags are the single source of truth for them.** `returnable` is not emitted, and is not planned.

That is a decision, not a gap waiting to be filled. Shipping both would put two answers to one question on the wire and leave the till to work out which wins — the failure mode being that they eventually disagree and nobody notices until a customer is charged twice for a cup. If the seam wants a `returnable` field it will have to be reconciled with the tag model first, not bolted alongside it.

What a till gets instead: products carry `tagIds`, and the catalog response carries a `tags` dictionary resolving each referenced id to `{ id, name, family? }`. Without that dictionary `tagIds` is a list of opaque slugs and a till can label nothing — be-BOP's own PoS loads exactly `{ _id, name }` for the same reason, so the seam mirrors it rather than inventing a second vocabulary. `family` is how be-BOP groups tags, which is what a widget groups by. The dictionary is scoped to tags the returned products actually carry: a tag no product uses is of no use to a till, and a catalog-wide dump would move the ETag on edits the till cannot observe.

The deposit mechanics themselves — what a returnable costs, how it comes back — still wait on negative-price products and then negative-price orders. That sequencing is unchanged. What the decision settles is which shape the API will express them in when they arrive.

### No order is flagged as belonging to an integration

> A worked example of the whole loop: [Tutorial — crediting a wristband from be-BOP orders](./tutorial-tagged-line-integration.md).

An integration typically acts on some orders and ignores the rest — a top-up system on top-ups, a locker on locker rentals. be-BOP does not carry a per-integration marker on the paid-order event, and will not: the moment one integration's vocabulary appears in the payload, every other integration inherits a field it must ignore.

The orders an integration cares about are identified **by the tags their lines carry**, and the caller says which tag it means, as `?tag=` on the paid-order poll and stream. be-BOP holds no domain word — not "top-up", not "deposit", not "locker": it is told "the lines that matter to me are tagged X" and answers accordingly. The same request serves any integration, and the shop names its own tags.

Naming a tag does three things at once. It **filters** the feed to orders carrying such a line. It **narrows `amount`** to that line alone, which is what an integration crediting a single item needs rather than the total of a basket it did not sell. And it surfaces **`key`**, the storefront `?key=` that line was bought with (#2688) — the identity of the physical thing scanned at the counter.

Tags are read from the product snapshot the order carries, not from the catalog as it stands now: a product tagged after the sale was not that kind of product when it was sold.

**An order carrying more than one line with the tag is not announced at all.** There is no correct way to choose between two matching lines, and crediting an arbitrary one is worse than crediting none. By the time a feed sees the order it is already paid, so refusing here can only mean staying silent and logging the condition for the shop; the guard that would prevent the situation belongs at the cart, before the money moves.

Not implemented: the pairing link/QR the seam describes as the way the credential reaches the till. Authentication is the existing admin-issued API key, which already accepts the `Authorization: Bearer` header the seam specifies. Pairing is a credential-delivery mechanism, not a protocol change — it can be added without moving this surface.

### Poll first, stream as an optimisation

A resource that streams is exposed twice: `<resource>` in JSON, `<resource>/stream` as SSE.

```
GET  /api/v1/orders/paid           JSON poll
GET  /api/v1/orders/paid/stream    SSE
GET  /api/v1/pos/orders            JSON poll
GET  /api/v1/pos/orders/stream     SSE
POST /api/v1/pos/orders            sale ingestion
```

The **poll is the primary transport**. A till on a bad link cannot be assumed to hold a connection open, and a surface that only streams leaves it with nothing. The stream is the optimisation you reach for when the link allows it.

Both carry the same events and the same `since_ts` / `last_event_id` vocabulary, so falling back costs nothing: the poll's `nextCursor` is the last order id of the page, which is exactly what the stream resumes on. A client can stream, drop, poll, and go back to streaming without relearning anything.

Separate routes rather than content negotiation on one path. An `Accept` header that changes the nature of a response is invisible in a log, in a cache, and in a URL pasted into a ticket — and the two transports want opposite cache headers, one an ETag and the other `no-transform`. This departs from the seam, which puts SSE on `GET /api/pos/orders`; the poll it has no shape for at all.

### Paid-order streaming

Both stream surfaces run on `openPaidOrderStream` (`orders/paidStreamConnection.ts`). The hard parts are not the payload: subscribing to the change-stream hub _before_ the backlog is read so nothing falls in the gap between snapshot and live edge, writing every frame through one serialized path so the cursor never goes backwards, keeping backpressure honest, and tearing down exactly once. Callers supply only the framing.

- One Mongo change stream is shared by every connection (`paidStreamHub.ts`). A change stream is a server-side cursor; one per connected till would put the cost of the fleet on the database.
- Four concurrent streams per API key, counted across both surfaces — two connections from one credential cost the same whichever route they came in by.
- Delivery is at-least-once. A document touched again after payment comes back through the change stream, and a resume replays the tail of the window; consumers deduplicate on `orderId`.
- Past a 1000-event backlog the connection closes rather than dropping frames silently, and the client reconnects from where it left off.
- Resume is keyed on `updatedAt`, never on `_id`: an order `_id` is a crypto UUID, so it sorts at random and could never express "everything after this point". The PoS seam resumes by order id, which is resolved to that position (`findOrderCursor`).

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
- [Wiring ETag validators to write routes](#conditional-requests--etag-2713) (explicit non-goal; reads are wired, `POST /api/v1/orders` stays on idempotency keys)
- Replacing `createOrder` internals
- Force-stock / upsert semantics
- Heavy OpenAPI codegen deps (hand-maintained `openapi.ts` + CDN Swagger UI instead)
