import { createHmac } from 'crypto';
import { collections } from './database';
import { ALLOW_PAID_ORDER_WEBHOOK } from './env-config';
import type { Order } from '$lib/types/Order';

function isPaidOrderWebhookEnabled(): boolean {
	return ALLOW_PAID_ORDER_WEBHOOK === 'true' || ALLOW_PAID_ORDER_WEBHOOK === '1';
}

export { isPaidOrderWebhookEnabled };

/**
 * Per-product outbound webhook fired when an order transitions to paid (see issue #2646).
 *
 * Fire-and-forget on purpose (PoC scope): a network or 5xx failure is logged via console.error
 * but never retried. Each product in the order whose `paidOrderWebhook` is configured triggers
 * its own POST, signed with HMAC-SHA256(secret, raw body) in `X-Webhook-Signature: sha256=<hex>`.
 *
 * The payload shape is documented in the PR description; the receiver verifies the signature
 * by recomputing HMAC-SHA256 with their own copy of the secret over the raw request body, in
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

	const payload = {
		timestamp: new Date().toISOString(),
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
		}))
	};
	const body = JSON.stringify(payload);

	await Promise.all(
		targets.map(async ({ _id: productId, paidOrderWebhook: hook }) => {
			const signature = 'sha256=' + createHmac('sha256', hook.secret).update(body).digest('hex');
			try {
				const res = await fetch(hook.apiRoute, {
					method: 'POST',
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
