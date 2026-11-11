# ADR 2687 — Batch write semantics for /api/v1/orders

## Status

Accepted (D1 frozen). D3 superseded: see [D3 revised](#d3-revised--one-call-one-order) below; the settle-on-duplicate behaviour described in decision 7 and in the consequences no longer applies.

## Context

External PoS systems need to push batches of orders. Failures are often partial (one unknown product, one stock issue). HTTP 207 Multi-Status is poorly supported by clients and CDNs. Rejecting an entire batch because one product is missing conflicts with be-BOP ability to keep historical orders for deleted products.

## Decision

1. Always HTTP 200 when the request is authenticated, authorized, rate-limit-ok, and schema-valid, and the server finished evaluating the batch (lot D+).
2. Return a per-command report (results[]) with created / duplicate / failed and optional warnings[].
3. Unknown products still created plus warning PRODUCT_MISSING (integrity label). Do not reject the batch.
4. If any warning exists and no hard failures, global status is ok_with_warnings.
5. Schema / auth / rate-limit failures stay classic 4xx with { error: { code, message, details? } }.
6. Lot C returns 501 NOT_IMPLEMENTED after auth plus Zod validation (no persistence).
7. **D3 (clarified):** `status: "duplicate"` means the idempotency key `(externalSourceApiKeyId, externalOrderId)` already exists. The response still returns the existing `orderId`. This is **not** always a pure read-only replay: **duplicate payment side-effects follow the same domain functions as admin order payment confirm/cancel** (`onOrderPayment` / `onOrderPaymentFailed` / `cancelPayment`). Payload may send `payment` or `payments[]`; each payload payment is matched to an unused still-pending order payment by `externalPaymentId` (preferred), else `(amountMinor + currency + method)`, else unused same index (legacy payloads without externalPaymentId). Client status `paid` → `onOrderPayment`; `canceled`/`failed`/`expired` → `onOrderPaymentFailed`. Non-pending existing payment or client `pending` → no-op. Other payload fields (items, amounts, labels) are **not** re-applied on duplicate.

## D3 revised — one call, one order

Settling payments onto an order that already exists made two failures possible: a paid payment sent after a failed one was discarded with no signal, while the response still read as a success; and a late failed payment was not kept. A failed order cannot be turned paid either, for accounting reasons.

So one call now creates one order, and nothing is ever reconciled onto an existing one:

- By default, an order whose `externalOrderId` the API key already sent is refused: status `failed`, error `DUPLICATE_EXTERNAL_ORDER_ID`, with the existing `orderId` in `details`. The existing order is left as it was.
- The option "Accept several orders with the same external id" on the API key lifts the refusal: every call creates its own order, each keeping the `externalOrderId` it was sent with. The `externalOrderId` is therefore no longer unique.
- The `duplicate` status is gone.

## Consequences

- Clients must inspect results[], not only HTTP status.
- Idempotent retries are safe (D2/D3): replaying a terminal payment intent applies the same admin domain transitions when the payment is still pending; replaying when already paid/terminal is a no-op on payment.
- Integrators should send `externalPaymentId` on every payment for safe retries / reorder.
- If payment sync throws after the idempotency key already exists, the command stays `duplicate` (optional `PAYMENT_SYNC_FAILED` warning) — never a batch HTTP 500.
- Observability should alert on PRODUCT_MISSING rates rather than treating them as transport errors.
