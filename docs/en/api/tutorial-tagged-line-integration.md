# Tutorial — crediting a wristband from be-BOP orders

A worked example of the most common shape of `/api/v1/pos` integration: an outside system that
cares about **some** of a shop's orders, acts on each one exactly once, and must keep working when
the network does not.

The example is a festival cashless system. Visitors top up a wristband, then spend from it at bars
that are not be-BOP. The same recipe fits a locker system, a ticketing partner, or a loyalty
platform — only the tag changes.

be-BOP knows nothing about wristbands. It is told which orders matter and reports them.

---

## What the shop sets up, once

**A product per top-up amount.** "Top-up 20", "Top-up 50" — ordinary products, priced as usual.

**A tag on those products.** Call it `topup`. Any slug works; the integration will name this one,
so pick it and keep it.

**A wristband that carries its own identity.** Each wristband is printed with a QR pointing at the
top-up product with its own key:

```
https://shop.example/product/topup-20?key=3Qz8yTaVbNk7Rf2mWpXs
```

be-BOP pre-selects that key on the product page, carries it through the cart, and stores it on the
order line (see issues #2688 and #2689). The visitor scans and pays; nothing is typed.

**An API key** with the scopes the integration needs: `pos:read` to poll, `pos:stream` to hold a
live connection, and `catalog:read` if it also wants the product list. Created in
Admin → API keys.

---

## The loop the integration runs

### 1. Read the catalog, occasionally

```http
GET /api/v1/pos/products?picture=data-uri&sizes=128
Authorization: Bearer bebop_ak_…
If-None-Match: "a3f8…"
```

`picture=data-uri` puts the images inside the response, so nothing has to be fetched afterwards —
the right trade on a festival network. `sizes=128` keeps them thumbnail-sized.

Store the `ETag` and send it back as `If-None-Match` next time. An unchanged catalog answers `304`
with no body, so polling every few minutes costs almost nothing.

Prices exclude VAT; each product carries the `vatRate` that applies, so the amount a visitor pays
is `price × (1 + vatRate / 100)`.

### 2. Poll the paid orders

```http
GET /api/v1/pos/orders?tag=topup&limit=100
Authorization: Bearer bebop_ak_…
```

```json
{
	"orders": [
		{
			"orderId": "3f2a0c…",
			"amount": { "amount": 20, "currency": "CHF" },
			"key": "3Qz8yTaVbNk7Rf2mWpXs",
			"vat": [{ "rate": 8.1, "amount": 1.5 }]
		}
	],
	"nextCursor": "3f2a0c…"
}
```

`tag=topup` is the whole trick. It does three things at once:

- **Filters.** Only orders carrying a line whose product bears that tag come back. A visitor who
  buys a beer and nothing else never appears.
- **Narrows the amount.** `amount` is the tagged line alone, not the basket. Someone who tops up 20
  and buys two beers still credits 20.
- **Surfaces the key.** `key` is the `?key=` the wristband's QR carried — the wristband's identity.

Feed `nextCursor` back as `last_event_id` on the next call. When it comes back `null`, you have
reached the end of the feed.

```http
GET /api/v1/pos/orders?tag=topup&last_event_id=3f2a0c…
```

### 3. Credit, once

Delivery is **at-least-once**: the same order can arrive twice after a reconnection or a replay.
Keep the `orderId` of everything you have credited and skip what you have already seen. That single
rule is what makes every other failure survivable.

### 4. Take the live feed when the link allows

```http
GET /api/v1/pos/orders/stream?tag=topup
Authorization: Bearer bebop_ak_…
```

```
retry: 5000

:ok

id: 3f2a0c…
data: {"orderId":"3f2a0c…","amount":{"amount":20,"currency":"CHF"},"key":"3Qz8yTaVbNk7Rf2mWpXs"}

:heartbeat
```

Same events, same parameters, same resume token. The `id:` line is the order id, which is also what
you deduplicate on.

`:heartbeat` arrives at least every 30 seconds. If one does not, the connection is dead even though
the socket may look open — reconnect.

On reconnection, send the last id you processed:

```http
GET /api/v1/pos/orders/stream?tag=topup
Last-Event-ID: 3f2a0c…
```

Authentication is a header, so a browser `EventSource` cannot be used. Drive the stream with an
HTTP client that lets you set headers.

---

## Choosing between the poll and the stream

The poll is the primary transport. It is the one to build first and the one to fall back to.

Use the stream when the link is good and latency matters, and drop to the poll when it is not. The
two carry identical events and share the same resume vocabulary, so switching costs nothing: the
poll's `nextCursor` is exactly what the stream resumes on, and the reverse holds too.

A reasonable policy: stream by default; after three failed reconnections in a row, poll every thirty
seconds; retry the stream every few minutes.

---

## Resuming, and why `last_event_id` beats `since_ts`

Both resume hints are advisory, and an unknown value starts you at the live edge rather than
failing.

`last_event_id` carries no timestamp and is immune to clock problems. Prefer it whenever you have
one.

`since_ts` (Unix epoch seconds) is for the first ever connection, or after losing your bookmark. It
is compared against the server's clock, so a register whose own clock runs fast could ask to resume
in the future — be-BOP clamps such a request to now rather than replaying nothing, which would
otherwise be a silent, permanent gap.

---

## Pushing sales back

If the integration also sells — a bar taking wristband payments — it reports those sales so they
land in be-BOP's accounting:

```http
POST /api/v1/pos/orders
Authorization: Bearer bebop_ak_…
Content-Type: application/json

[
  {
    "externalOrderId": "till-3-000412",
    "soldAt": "2026-07-29T14:03:00Z",
    "method": "cashless",
    "totalPrice": { "amount": 12.5, "currency": "CHF" },
    "items": [
      { "product": "biere-pression", "quantity": 1, "price": { "amount": 12.5, "currency": "CHF" } }
    ]
  }
]
```

```json
{
	"results": [
		{
			"externalOrderId": "till-3-000412",
			"status": "success",
			"orderUrl": "https://shop.example/order/…"
		}
	]
}
```

Five things worth knowing.

**`externalOrderId` is yours, and it is the idempotency key.** Re-pushing the same reference with
the same payload is a `success` no-op. Re-pushing it with anything different is a `conflict`, and
`orderUrl` points at the order that already holds it — that is a bug in your till, not a race.

**`soldAt` is when the sale happened**, not when you send it. A batch sitting in a queue overnight
still reports the real time; reporting and VAT day boundaries follow it. Send RFC 3339 with an
offset, and send UTC if you can. The past is unbounded, so a long backlog is fine; the future is
refused beyond 24 hours, because a sale ahead of now is always a clock bug.

**`method` is the slug of a PoS payment subtype the shop configured.** It labels the payment in
be-BOP's accounting. If the shop has not created it, the sale is still recorded and a
`POS_LABEL_UNKNOWN` warning is returned.

**`price` is what you actually charged**, per unit. be-BOP records that rather than repricing from a
catalog that may have moved since. A divergence is reported as a `PRICE_OVERRIDE` warning.

**The status code tells you whether to retry.** A `400` means the shop refused a sale for a reason
sending it again will not change — an unsupported currency, a product that does not exist. The
error `details` name the refused `externalOrderId`, the reason, and `ingested`: the references from
the same batch that did land. Fix the batch, push it whole again, and those settle as no-ops. A
`500` means something on be-BOP's side went wrong and a later attempt may well succeed — back off
and retry that one unchanged.

Retrying a whole batch is always safe.

---

## Things that will bite, and what to do

**An order with two tagged lines is not announced at all.** Two top-ups in one basket give no
correct way to choose which wristband to credit, so be-BOP stays silent and logs it rather than
crediting one at random. Prevent it upstream: sell top-ups one per order.

**A product tagged after a sale does not make that sale retroactive.** Tags are read from the
product snapshot the order carries. Tag your top-up products before selling them.

**The tag is matched exactly**, `topup` is not `Topup`.

**Amounts are in major units** on this surface — `20` is twenty francs, not twenty centimes.

**`amount` includes VAT**; `vat` breaks out what is inside it, at the rate charged on the day. Those
figures are snapshotted at payment time and never recomputed, so a later rate change does not
rewrite history.

---

## The whole thing, in pseudocode

```
credited = load_credited_order_ids()
cursor   = load_cursor()

loop:
    if link_is_good:
        stream("/api/v1/pos/orders/stream?tag=topup", last_event_id = cursor)
    else:
        page = get("/api/v1/pos/orders?tag=topup", last_event_id = cursor)

    for event in events:
        if event.orderId in credited:
            continue
        credit(wristband = event.key, amount = event.amount.amount)
        credited.add(event.orderId)
        cursor = event.orderId
        persist(credited, cursor)
```

Persist `credited` and `cursor` together, and persist them **after** the credit has been applied.
That ordering is what makes a crash mid-loop replay one event rather than lose one.
