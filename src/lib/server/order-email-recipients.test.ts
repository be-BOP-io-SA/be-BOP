import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	CUSTOMER_ALWAYS_EMAILED,
	ORDER_EMAIL_TEMPLATE_KEYS,
	orderEmailRecipientsFor,
	resetConfig,
	runtimeConfig,
	shopGetsOrderEmail
} from './runtime-config';

describe('order e-mail recipients', () => {
	beforeEach(resetConfig);
	afterEach(resetConfig);

	it('lists every order e-mail, bank transfer included', () => {
		expect(ORDER_EMAIL_TEMPLATE_KEYS).toContain('order.payment.pending.bank-transfer');
		expect(ORDER_EMAIL_TEMPLATE_KEYS).toContain('order.payment.paid');
		expect(ORDER_EMAIL_TEMPLATE_KEYS).toContain('order.paid');
	});

	it('defaults an e-mail the shop never saved to the customer and the master switch', () => {
		runtimeConfig.orderEmailRecipients = {};

		runtimeConfig.copyOrderEmailsToAdmin = true;
		expect(orderEmailRecipientsFor('order.payment.expired')).toEqual({
			customer: true,
			shop: true
		});

		runtimeConfig.copyOrderEmailsToAdmin = false;
		expect(orderEmailRecipientsFor('order.payment.expired')).toEqual({
			customer: true,
			shop: false
		});
	});

	it('follows the saved choices once the master switch is off', () => {
		runtimeConfig.copyOrderEmailsToAdmin = false;
		runtimeConfig.orderEmailRecipients = {
			'order.payment.pending.card': { customer: false, shop: false },
			'order.paid': { customer: true, shop: true }
		};

		expect(orderEmailRecipientsFor('order.payment.pending.card').customer).toBe(false);
		expect(shopGetsOrderEmail('order.payment.pending.card')).toBe(false);
		expect(shopGetsOrderEmail('order.paid')).toBe(true);
	});

	it('always e-mails the customer what became of a payment, even if saved as off', () => {
		runtimeConfig.orderEmailRecipients = Object.fromEntries(
			CUSTOMER_ALWAYS_EMAILED.map((key) => [key, { customer: false, shop: false }])
		);

		expect(CUSTOMER_ALWAYS_EMAILED).toEqual([
			'order.paid',
			'order.payment.paid',
			'order.payment.expired',
			'order.payment.canceled'
		]);
		for (const key of CUSTOMER_ALWAYS_EMAILED) {
			expect(orderEmailRecipientsFor(key)).toEqual({ customer: true, shop: false });
		}
	});

	it('copies every order e-mail to the shop while the master switch is on', () => {
		runtimeConfig.copyOrderEmailsToAdmin = true;
		runtimeConfig.orderEmailRecipients = {
			'order.payment.expired': { customer: true, shop: false }
		};

		expect(shopGetsOrderEmail('order.payment.expired')).toBe(true);
	});
});
