import { createHmac } from 'crypto';
import { collections } from './database';
import { ALLOW_PAID_ORDER_WEBHOOK } from './env-config';
import { assertPublicWebhookTarget } from './webhook-url-guard';
import { orderItemPrice, type Order } from '$lib/types/Order';

function isPaidOrderWebhookEnabled(): boolean {
	return ALLOW_PAID_ORDER_WEBHOOK === 'true' || ALLOW_PAID_ORDER_WEBHOOK === '1';
}

export { isPaidOrderWebhookEnabled };

/**
 * The webhook config (notably its shared `secret`) must never be persisted into an order document:
 * the admin JSON endpoint dumps orders verbatim and they sit in plaintext Mongo. The fire path
 * re-queries the *live* product for the freshest endpoint/secret, so dropping it from the order
 * snapshot loses nothing. Returns a shallow copy with `paidOrderWebhook` removed (input untouched
 * when the field is absent, so non-webhook products keep their identity).
 */
export function stripPaidOrderWebhook<T extends { paidOrderWebhook?: unknown }>(product: T): T {
	if (!product.paidOrderWebhook) {
		return product;
	}
	const copy = { ...product };
	delete copy.paidOrderWebhook;
	return copy;
}

/**
 * What the buyer actually paid for one line. PWYW amounts and variation surcharges live in the
 * line's `customPrice` snapshot, and `orderItemPrice` applies the POS discount and free units on
 * top of it, so this is the charged figure rather than the catalogue price.
 *
 * Returns null instead of throwing when a line carries no snapshot: the notification for the rest
 * of the order must not be suppressed by one malformed line.
 */
function linePaidAmount(item: Order['items'][number]): { amount: number; currency: string } | null {
	const snapshot = item.currencySnapshot?.main;
	if (!snapshot) {
		return null;
	}
	try {
		return {
			amount: orderItemPrice(item, 'main'),
			currency: (snapshot.customPrice ?? snapshot.price).currency
		};
	} catch (err) {
		console.error('[paidOrderWebhook] could not price line for product', item.product._id, err);
		return null;
	}
}

/**
 * Body sent to one product's webhook.
 *
 * `items` is scoped to the receiving product's own lines — never the whole cart. A per-product
 * hook belongs to whoever sells that product, and a shared basket would otherwise hand them
 * another seller's lines. A product can still appear several times in one order (different
 * `uniqueKey`, different variations), hence an array (issue #2688).
 */
function buildPayload(order: Order, productId: string, timestamp: string) {
	return {
		timestamp,
		orderId: order._id,
		orderNumber: order.number,
		contact: {
			email: order.notifications.paymentStatus.email ?? null,
			npub: order.notifications.paymentStatus.npub ?? null
		},
		...(order.billingAddress && { billingAddress: order.billingAddress }),
		customCheckoutFields: (order.customCheckoutFields ?? []).map((f) => ({
			slug: f.slug,
			label: f.label,
			...(f.address ? { address: f.address } : { value: f.value ?? '' })
		})),
		items: order.items
			.filter((item) => item.product._id === productId)
			.map((item) => {
				const amountPaid = linePaidAmount(item);
				return {
					productId: item.product._id,
					quantity: item.quantity,
					...(item.uniqueKey && { uniqueKey: item.uniqueKey }),
					...(amountPaid && { amountPaid })
				};
			})
	};
}

/**
 * Per-product outbound webhook fired when an order transitions to paid (see issue #2646).
 *
 * Fire-and-forget on purpose (PoC scope): a network or 5xx failure is logged via console.error
 * but never retried. Each product in the order whose `paidOrderWebhook` is configured triggers
 * its own POST, signed with HMAC-SHA256(secret, raw body) in `X-Webhook-Signature: sha256=<hex>`.
 *
 * The body is built per target (see buildPayload: each receiver only sees its own product's
 * lines), so each POST is signed over its own bytes. The receiver verifies the signature by
 * recomputing HMAC-SHA256 with their own copy of the secret over the raw request body, in
 * constant time.
 */
export async function firePaidOrderWebhooks(order: Order): Promise<void> {
	if (!isPaidOrderWebhookEnabled()) {
		return;
	}
	const productIds = [...new Set(order.items.map((i) => i.product._id))];
	if (productIds.length === 0) {
		return;
	}

	// Use the *live* product config, not the order's snapshot — admins may have wired up the
	// webhook after the order was placed and we want the freshest endpoint / secret.
	const products = await collections.products
		.find({ _id: { $in: productIds } })
		.project<{ _id: string; paidOrderWebhook?: { apiRoute: string; secret: string } }>({
			_id: 1,
			paidOrderWebhook: 1
		})
		.toArray();

	const targets = products.filter(
		(p): p is { _id: string; paidOrderWebhook: { apiRoute: string; secret: string } } =>
			!!p.paidOrderWebhook?.apiRoute && !!p.paidOrderWebhook?.secret
	);
	if (targets.length === 0) {
		return;
	}

	// One timestamp for the whole fan-out, so sibling POSTs for the same order agree.
	const timestamp = new Date().toISOString();

	await Promise.all(
		targets.map(async ({ _id: productId, paidOrderWebhook: hook }) => {
			// Defence-in-depth against SSRF: re-vet the target at fire time (catches products saved
			// before this guard existed, and DNS rebinding) and refuse redirects to another host.
			try {
				await assertPublicWebhookTarget(hook.apiRoute);
			} catch (err) {
				console.error(
					`[paidOrderWebhook] refusing unsafe target ${hook.apiRoute} for product ${productId} on order ${order.number}:`,
					err
				);
				return;
			}
			const body = JSON.stringify(buildPayload(order, productId, timestamp));
			const signature = 'sha256=' + createHmac('sha256', hook.secret).update(body).digest('hex');
			try {
				const res = await fetch(hook.apiRoute, {
					method: 'POST',
					redirect: 'error',
					headers: {
						'Content-Type': 'application/json',
						'X-Webhook-Signature': signature
					},
					body
				});
				if (!res.ok) {
					console.error(
						`[paidOrderWebhook] ${hook.apiRoute} for product ${productId} on order ${order.number} returned ${res.status}`
					);
				}
			} catch (err) {
				console.error(
					`[paidOrderWebhook] ${hook.apiRoute} for product ${productId} on order ${order.number} failed:`,
					err
				);
			}
		})
	);
}
