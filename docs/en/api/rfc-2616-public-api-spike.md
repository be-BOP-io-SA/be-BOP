# RFC spike: public API shape (#2616)

Status: spike / decision record. Not a storefront rewrite.

## REST vs GraphQL

**Stay REST on Face A** (`/api/v1/*` resources, API-key auth, explicit scopes).

Face B remains the existing SvelteKit session storefront (cookies, CSRF, cart). A GraphQL layer would duplicate cart/session semantics and invite a headless rewrite we are not doing.

If a partner later needs a richer query language, add it as Face C behind the same keys — do not collapse Face A and Face B.

## CORS and tokens

Face A tokens are **API keys** (`Authorization: Bearer` or `X-Api-Key`), not user JWTs.

CORS is an **allowlist of exact origins** configured in Admin → API Keys. Empty allowlist = no browser cross-origin. `*` is rejected at parse time.

Server-to-server (no `Origin`) does not need CORS.

## Polling vs Lightning webhooks

Lightning / invoice paid notifications stay on the existing payment processors (push to be-BOP).

Partner **egress** for fulfilment (armband charge, locker, etc.):

- **Poll `GET /api/v1/orders/paid`** (this PR, #2689). The other system fetches. Simple, retry-friendly, no inbound firewall hole on the partner.
- Product-level **outbound webhook #2646** is a per-product HMAC POST. It is not a replacement for paid-order read: it fires per product, carries a shared secret on the product document, and is fire-and-forget.

Do not add a second generic “order paid webhook” in v1 unless poll latency is proven insufficient.

## Versioning

- URL prefix `/api/v1`. Additive fields are allowed. Breaking changes require `/api/v2`.
- OpenAPI at `/api/v1/openapi.json` is the contract.
- Dates: ISO-8601. Money: integer minor units + ISO currency.

## Out of scope

Headless storefront rewrite, GraphQL, replacing Face B session cart, exposing unique `?key=` secrets in the catalog DTO.
