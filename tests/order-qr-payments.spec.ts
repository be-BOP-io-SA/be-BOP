import { expect, test, type Locator } from './client-ip.js';
import { ObjectId } from 'mongodb';
import { orderAwaiting, withDb } from './pending-order.js';

const BITCOIN_ORDER = 'e2e-qr-bitcoin';
const LIGHTNING_ORDER = 'e2e-qr-lightning';
const ADDRESS = 'bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7';
const INVOICE = 'lnbc250u1e2eqrpaymentsinvoice';

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('orders').replaceOne(
			{ _id: BITCOIN_ORDER as never },
			orderAwaiting(990041, {
				_id: new ObjectId(),
				method: 'bitcoin',
				// Not configured in the suite, so nothing polls this payment.
				processor: 'bitcoin-nodeless',
				price: { amount: 25_000, currency: 'SAT' },
				address: ADDRESS,
				expiresAt: new Date(Date.now() + 3_600_000)
			}),
			{ upsert: true }
		);
		await db.collection('orders').replaceOne(
			{ _id: LIGHTNING_ORDER as never },
			orderAwaiting(990042, {
				_id: new ObjectId(),
				method: 'lightning',
				processor: 'phoenixd',
				price: { amount: 25_000, currency: 'SAT' },
				address: INVOICE,
				invoiceId: 'e2e-qr-invoice',
				expiresAt: new Date(Date.now() + 3_600_000)
			}),
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb((db) =>
		db
			.collection('orders')
			.deleteMany({ _id: { $in: [BITCOIN_ORDER, LIGHTNING_ORDER] as never[] } })
	);
});

async function expectDrawn(qrCode: Locator) {
	await expect(qrCode).toBeVisible();
	await expect
		.poll(() => qrCode.evaluate((image: HTMLImageElement) => image.naturalWidth))
		.toBeGreaterThan(0);
}

test('an on-chain payment shows a QR code that opens a wallet on the amount due', async ({
	page
}) => {
	await page.goto(`/order/${BITCOIN_ORDER}`);

	await expectDrawn(page.locator(`a[href="bitcoin:${ADDRESS}?amount=0.00025"] img[alt="QR code"]`));
	await expect(page.getByText(ADDRESS).first()).toBeVisible();
});

test('a Lightning payment shows a QR code that opens a wallet on the invoice', async ({ page }) => {
	await page.goto(`/order/${LIGHTNING_ORDER}`);

	await expectDrawn(page.locator(`a[href="lightning:${INVOICE}"] img[alt="QR code"]`));
});
