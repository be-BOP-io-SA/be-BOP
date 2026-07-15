import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '../test-utils';
import { collections } from '../database';
import { TEST_DIGITAL_PRODUCT } from '../seed/product';
import { createOrder, onOrderPayment } from '../orders';
import { runtimeConfig } from '../runtime-config';
import type { SellerIdentity } from '$lib/types/SellerIdentity';
import { generateEInvoice } from './generate';

const TEST_SELLER: SellerIdentity = {
	businessName: 'ACME SAS',
	vatNumber: 'FR12345678901',
	address: { street: '1 rue de la Paix', zip: '75002', city: 'Paris', country: 'FR' },
	contact: { email: 'acme@example.com' },
	legal: { siret: '12345678900011', legalForm: 'SAS' }
};

async function createPaidOrder() {
	const orderId = await createOrder(
		[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
		'point-of-sale',
		{
			locale: 'en',
			user: { sessionId: 'test-session-id' },
			shippingAddress: null,
			userVatCountry: 'FR'
		}
	);
	const order = await collections.orders.findOne({ _id: orderId });
	if (!order) {
		throw new Error('Order not found');
	}
	await onOrderPayment(order, order.payments[0], order.payments[0].price);
	const paid = await collections.orders.findOne({ _id: orderId });
	if (!paid) {
		throw new Error('Order not found after payment');
	}
	return paid;
}

describe('e-invoice', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		runtimeConfig.eInvoicing = { enabled: true, country: 'FR', platform: 'none' };
		runtimeConfig.sellerIdentity = TEST_SELLER;
	});

	afterEach(() => {
		runtimeConfig.eInvoicing = { enabled: false, country: 'FR', platform: 'none' };
		runtimeConfig.sellerIdentity = null;
	});

	it('does not enqueue an e-invoice when the feature is disabled', async () => {
		runtimeConfig.eInvoicing = { ...runtimeConfig.eInvoicing, enabled: false };

		await createPaidOrder();

		expect(await collections.eInvoices.countDocuments()).toBe(0);
	});

	it('enqueues one pending e-invoice per paid payment, aligned with the invoice number', async () => {
		const order = await createPaidOrder();

		const einvoices = await collections.eInvoices.find({}).toArray();
		expect(einvoices).toHaveLength(1);
		expect(einvoices[0]).toMatchObject({
			orderId: order._id,
			orderNumber: order.number,
			paymentId: order.payments[0]._id.toString(),
			invoiceNumber: order.payments[0].invoice?.number,
			country: 'FR',
			format: 'factur-x'
		});
		expect(einvoices[0].generation.status).toBe('pending');

		// Re-processing the already-paid payment must not enqueue a duplicate
		await onOrderPayment(order, order.payments[0], order.payments[0].price);
		expect(await collections.eInvoices.countDocuments()).toBe(1);
	});

	it('generates the Factur-X artifacts end-to-end (inline storage without S3)', async () => {
		await createPaidOrder();
		const pending = await collections.eInvoices.findOne({});
		if (!pending) {
			throw new Error('Pending e-invoice not found');
		}

		// Force the inline-storage path even when the test env has S3 configured
		const s3Bucket = runtimeConfig.s3.bucket;
		runtimeConfig.s3.bucket = '';
		try {
			await generateEInvoice(pending);
		} finally {
			runtimeConfig.s3.bucket = s3Bucket;
		}

		const generated = await collections.eInvoices.findOne({ _id: pending._id });
		expect(generated?.generation.status).toBe('generated');
		expect(['BTC', 'SAT']).not.toContain(generated?.currency);
		expect(generated?.seller?.siren).toBe('123456789');
		expect(generated?.totals?.inclVat).toBeGreaterThan(0);

		// Snapshotted for the admin document view (regression: these used to be
		// silently dropped even though the mapper already computed them)
		expect(generated?.lines?.length).toBeGreaterThan(0);
		expect(generated?.issueDate).toBeInstanceOf(Date);
		expect(generated?.paidWith?.fiatEquivalent).toBeDefined();

		// XML inline, references the invoice number and stays in the fiat currency
		expect(generated?.artifacts?.xml.content).toContain(
			`<ram:ID>${pending.invoiceNumber}</ram:ID>`
		);
		expect(generated?.artifacts?.xml.content).toContain(
			`<ram:InvoiceCurrencyCode>${generated?.currency}</ram:InvoiceCurrencyCode>`
		);

		// PDF inline (S3 not configured in tests), a real PDF with content
		expect(generated?.artifacts?.pdf.storage).toBe('inline');
		const pdfBytes = generated?.artifacts?.pdf.data?.buffer;
		expect(pdfBytes).toBeDefined();
		expect(
			Buffer.from(pdfBytes ?? [])
				.subarray(0, 5)
				.toString()
		).toBe('%PDF-');

		// Status history recorded the transition
		expect(generated?.statusHistory.map((entry) => entry.status)).toEqual(['pending', 'generated']);
	});
});
