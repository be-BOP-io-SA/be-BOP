import { expect, test, type Page } from './client-ip.js';
import { ObjectId } from 'mongodb';
import { orderAwaiting, withDb } from './pending-order.js';

const ORIGIN = 'http://localhost:5012';

const SETTLED_ORDER = 'e2e-return-settled';
const UNSETTLED_ORDER = 'e2e-return-unsettled';
const PAYPAL_ORDER = 'e2e-return-paypal';
const SETTLED_PAYMENT = new ObjectId();
const UNSETTLED_PAYMENT = new ObjectId();
const PAYPAL_PAYMENT = new ObjectId();

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('orders').replaceOne(
			{ _id: SETTLED_ORDER as never },
			orderAwaiting(990061, {
				_id: SETTLED_PAYMENT,
				method: 'card',
				processor: 'stripe',
				// The web server of the suite answers that this payment intent succeeded.
				checkoutId: 'pi_e2e_paid_return',
				address: `${ORIGIN}/order/${SETTLED_ORDER}/payment/${SETTLED_PAYMENT}/pay`
			}),
			{ upsert: true }
		);
		await db.collection('orders').replaceOne(
			{ _id: UNSETTLED_ORDER as never },
			orderAwaiting(990062, {
				_id: UNSETTLED_PAYMENT,
				method: 'card',
				// Not configured in the suite, so nothing ever settles this payment.
				processor: 'sumup',
				checkoutId: 'e2e-return-checkout',
				address: `${ORIGIN}/order/${UNSETTLED_ORDER}/payment/${UNSETTLED_PAYMENT}/pay`
			}),
			{ upsert: true }
		);
		await db.collection('orders').replaceOne(
			{ _id: PAYPAL_ORDER as never },
			orderAwaiting(990063, {
				_id: PAYPAL_PAYMENT,
				method: 'paypal',
				processor: 'paypal',
				checkoutId: 'E2E-RETURN-PAYPAL',
				address: 'https://www.sandbox.paypal.com/checkoutnow?token=E2E-RETURN-PAYPAL'
			}),
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb((db) =>
		db
			.collection('orders')
			.deleteMany({ _id: { $in: [SETTLED_ORDER, UNSETTLED_ORDER, PAYPAL_ORDER] as never[] } })
	);
});

const confirming = (page: Page) => page.locator('.payment-confirming');
const payLink = (page: Page, orderId: string, paymentId: ObjectId) =>
	page.locator(`a[href="/order/${orderId}/payment/${paymentId}/pay"]`);

test('a buyer back from paying waits for the confirmation instead of being asked to pay again', async ({
	page,
	context
}) => {
	await page.goto(`/order/${SETTLED_ORDER}?paymentReturn=${SETTLED_PAYMENT}`);

	await expect(confirming(page)).toHaveText('Confirming your payment…');
	await expect(payLink(page, SETTLED_ORDER, SETTLED_PAYMENT)).toHaveCount(0);
	await expect(page.locator('img[alt="QR code"]')).toHaveCount(0);

	// The payment poller only checks a processor the shop has configured: doing so now, in
	// another tab, is what lets it settle this payment while the buyer is waiting.
	const admin = await context.newPage();
	await admin.goto('/admin/stripe', { waitUntil: 'networkidle' });
	try {
		await admin.getByLabel('Secret Key').fill('sk_test_e2e');
		await admin.getByLabel('Public Key').fill('pk_test_e2e');
		await admin.getByRole('button', { name: 'Save' }).click();
		await admin.waitForLoadState('networkidle');

		// Without a reload: the page asks again every second while it waits.
		await expect(page.locator('.payment-item summary')).toContainText('paid', { timeout: 30_000 });
		await expect(confirming(page)).toHaveCount(0);
		await expect(payLink(page, SETTLED_ORDER, SETTLED_PAYMENT)).toHaveCount(0);
	} finally {
		// Saved keys make Stripe a card processor of the shop for every spec that follows.
		await admin.goto('/admin/stripe', { waitUntil: 'networkidle' });
		await admin.getByRole('button', { name: 'Reset' }).click();
		await admin.waitForLoadState('networkidle');
	}
});

test('the link to pay comes back when no confirmation arrives', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto(`/order/${UNSETTLED_ORDER}?paymentReturn=${UNSETTLED_PAYMENT}`);

	await expect(confirming(page)).toBeVisible();
	await expect(payLink(page, UNSETTLED_ORDER, UNSETTLED_PAYMENT)).toHaveCount(0);

	// Thirty seconds: the buyer may have cancelled at the provider, and must be able to retry.
	await expect(payLink(page, UNSETTLED_ORDER, UNSETTLED_PAYMENT)).toBeVisible({ timeout: 45_000 });
	await expect(confirming(page)).toHaveCount(0);
});

test('without a payment to confirm, the link to pay shows at once', async ({ page }) => {
	await page.goto(`/order/${UNSETTLED_ORDER}`);
	await expect(payLink(page, UNSETTLED_ORDER, UNSETTLED_PAYMENT)).toBeVisible();
	await expect(confirming(page)).toHaveCount(0);

	// The id of a payment that is not one of this order's changes nothing.
	await page.goto(`/order/${UNSETTLED_ORDER}?paymentReturn=${SETTLED_PAYMENT}`);
	await expect(payLink(page, UNSETTLED_ORDER, UNSETTLED_PAYMENT)).toBeVisible();
	await expect(confirming(page)).toHaveCount(0);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('a buyer back from PayPal reads the wait in French, without the PayPal link', async ({
		page
	}) => {
		await page.goto(`/order/${PAYPAL_ORDER}?paymentReturn=${PAYPAL_PAYMENT}`);

		await expect(confirming(page)).toHaveText('Confirmation du paiement en cours…');
		await expect(page.locator('.paypal-payment-link')).toHaveCount(0);
	});
});
