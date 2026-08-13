# Public HTTP API (PoS concentrator)

## What it is for

be-BOP can act as a **concentrator** for one or more point-of-sale systems (tills, armband chargers, partner kiosks). Those systems talk to be-BOP over a versioned, authenticated HTTP API (`/api/v1`), not a user session.

Typical loop:

1. The partner creates an API key in Admin (scopes + CORS).
2. The till **reads the catalog** (`GET /api/v1/catalog/products`).
3. The till **writes paid orders** in batch (`POST /api/v1/orders`).
4. Another system (for example an armband charger) **polls paid orders** (`GET /api/v1/orders/paid`) — this is a **read**, not a webhook.

Interactive storefront checkout stays on Face B (cookies / session). Do not mix the two.

Interactive OpenAPI: [`/api/v1/docs`](/api/v1/docs) (schema at [`/api/v1/openapi.json`](/api/v1/openapi.json)).

## Create a key (Admin → API Keys)

1. Sign in as Super Admin.
2. Open **Admin → API Keys**.
3. Create a key: name (e.g. "Front desk till"), and scopes.
4. Copy the secret immediately. It is shown once. be-BOP stores only `SHA-256(secret)`.
5. Save CORS origins on the same page (one origin per line). Empty means no cross-origin browser access. `*` is never allowed.

Send the secret as `Authorization: Bearer <secret>` or `X-Api-Key: <secret>`. Missing/invalid key → 401. Wrong scope → 403.

## Scopes

| Scope          | Endpoints                                                           |
| -------------- | ------------------------------------------------------------------- |
| `orders:write` | `POST /api/v1/orders`                                               |
| `catalog:read` | `GET /api/v1/catalog/products`, `GET /api/v1/catalog/products/{id}` |
| `orders:read`  | `GET /api/v1/orders/paid`                                           |

Grant only what the partner needs. A catalog-only kiosk should not receive `orders:write`.

## CORS

Cross-origin browser calls are allowlisted. Server-to-server calls (no `Origin` header) are unaffected. Fail-closed: unknown origins get no `Access-Control-Allow-Origin`.

## Catalog read

`GET /api/v1/catalog/products?type=resource&tags=tag-a,tag-b&limit=20&cursor=…&lang=en`

Stable DTO: id, aliases, type, translated name/shortDescription, price in **minor units**, PWYW flag, shipping, tags, variations, stock available. Hidden products (neither eShop nor retail visible) are omitted.

## Orders write

See [v1 orders write](./api/v1-orders-write.md). Batch, idempotent on `(apiKey, externalOrderId)`.

## Paid-orders read (poll)

`GET /api/v1/orders/paid?since=…&until=…&limit=20&cursor=…`

Only orders with at least one **paid** payment. Payload includes product lines, optional `uniqueKey` (from storefront `?key=`), and the amount **actually paid**. This replaces a push webhook for partners that prefer to pull (issue #2689). The product-level paid webhook (#2646) is unrelated and not sufficient for this flow.

## Storefront unique key (`?key=`)

`/product/{slug}?key=kfdjsfeaz12845ND9xezj91820` preselects a unique artifact secret. It is stored on the cart line and copied onto the order. Pay-what-you-want and light variations coexist with this secret. This is **not** an API key; it is a customer-facing product identifier.

## Rate limits

Per API key, in addition to an IP safety net. `429` responses include `Retry-After`.

## Versioning

`/api/v1` is the current Face A contract. Breaking changes will go to `/api/v2`. See the [API spike RFC](./api/rfc-2616-public-api-spike.md).
