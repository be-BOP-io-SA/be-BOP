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

## Switch the API on (Admin → API Keys)

The API is **off by default**, and only the shop can turn it on: tick **API enabled** on **Admin → API Keys** and save. The page stays usable while the API is off, so keys can be prepared first.

While it is off, every `/api/v1` address answers `404` with the usual error envelope (`{ "error": { "code": "NOT_FOUND", "message": "Not found" } }`) and nothing else: `GET /api/v1/health`, `openapi.json`, `docs` and the product pictures too, `OPTIONS` preflights included, and no key works. A shop that has not switched the API on cannot be told from one that has none. A device must not read this `404` as a temporary condition: unlike maintenance (`503`), nothing in it asks the caller to try again later.

Unticking the box closes the event streams that are open at once; each stream also checks the setting at every heartbeat, so a shop running several servers has them all closed within 25 seconds.

A trailing slash is accepted on every `/api/v1` address: `/api/v1/health/` answers like `/api/v1/health`, with no redirect.

An `/api/v1` address that does not exist (`/api/v1`, `/api/v1/zzz`, `/api/v1/orders/abc`…) answers a JSON `404` in the same error envelope, whatever the method and whether the API is switched on or not, never a page of the site.

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

See [v1 orders write](./api/v1-orders-write.md). Batch; one call, one order. An `externalOrderId` the key already sent is refused, unless the key accepts several orders per id.

## Order streams

Three Server-Sent Events streams, each with the `orders:stream` scope. They carry what happens from the moment they open and resume after the last event received (`Last-Event-ID`, a signed cursor); the history is read from the listings. A stream opened at the live edge sends an `id:` line with no event as soon as it opens, dated from that moment: keep it as the last id, and a connection cut before the first event resumes from it instead of from the present.

- `GET /api/v1/orders/paid/stream`: a sale once it is paid, announced once.
- `GET /api/v1/orders/stream`: every order on each change of the order itself — created pending, paid, failed, cancelled, expired.
- `GET /api/v1/orders/updates/stream`: a note or a label put on an order, or its personal data erased — and only that.

## Paid-orders read (poll)

`GET /api/v1/orders/paid?since=…&until=…&limit=20&cursor=…`

Only orders with at least one **paid** payment. Payload includes product lines with the variations chosen on each, and the amount **actually paid**. This replaces a push webhook for partners that prefer to pull (issue #2689). The product-level paid webhook (#2646) now carries the same per-line detail, but it is a push scoped to one product's own lines — it cannot serve a poller that needs every paid order in the shop.

## Conditional GETs (ETag)

Every read (`/catalog/products`, `/catalog/products/{id}`, `/orders/paid`) returns a strong `ETag` over the JSON body plus `Cache-Control: private, no-cache`. Replay that value in `If-None-Match` and an unchanged representation answers `304 Not Modified` with no body — the cheap way to poll paid orders on a short interval.

```
GET /api/v1/orders/paid?since=2026-08-16T00:00:00Z
→ 200  ETag: "9f2b…"

GET /api/v1/orders/paid?since=2026-08-16T00:00:00Z
If-None-Match: "9f2b…"
→ 304  ETag: "9f2b…"   (empty body)
```

`304` still counts against the rate limit. Browser callers read `ETag` through `Access-Control-Expose-Headers`. Writes take no ETag precondition. `POST /api/v1/orders` is not idempotent: an order whose `externalOrderId` the API key already sent is refused with `DUPLICATE_EXTERNAL_ORDER_ID`, and the existing order is left as it was, unless the key accepts several orders per external id.

## Variations, and the identifier a link carries (`?key=`)

Wherever the API returns a catalog product, it returns the values the product offers in each variation family (`variations`, such as `{ "size": ["35", "36"], "color": ["red"] }`), with `variationLabels` for their display names and, in the general catalog, `variationPrices` for the values that add to the price. Wherever it returns a product that was bought — order reads, paid-order streams, the point-of-sale feed, the product's paid-order webhook — it returns the value chosen in each family on that line (`chosenVariations`, such as `{ "size": "35", "color": "red" }`). Writes take `chosenVariations` the same way.

A unique item, such as a wristband, is identified by a variation. The product has a variation family, for instance `key`, whose values are the identifiers; the family can be hidden from the product page. A link such as `/product/{slug}?key=kfdjsfeaz12845ND9xezj91820` sets that variation, and the identifier reaches the order as `chosenVariations.key`. A value the product does not offer is refused. This `?key=` is **not** an API key.

## Rate limits

Per API key, in addition to an IP safety net. `429` responses include `Retry-After`.

## Versioning

`/api/v1` is the current Face A contract. Breaking changes will go to `/api/v2`. See the [API spike RFC](./api/rfc-2616-public-api-spike.md).
