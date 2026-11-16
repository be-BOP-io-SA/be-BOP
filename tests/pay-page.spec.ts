import { expect, test, type Page } from './client-ip.js';
import { ObjectId } from 'mongodb';
import { orderAwaiting, withDb } from './pending-order.js';

const ORIGIN = 'http://localhost:5012';

const STRIPE_ORDER = 'e2e-pay-page-stripe';
const SUMUP_ORDER = 'e2e-pay-page-sumup';
const STRIPE_PAYMENT = new ObjectId();
const SUMUP_PAYMENT = new ObjectId();

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('orders').replaceOne(
			{ _id: STRIPE_ORDER as never },
			orderAwaiting(990011, {
				_id: STRIPE_PAYMENT,
				method: 'card',
				processor: 'stripe',
				// The web server of the suite answers for a payment intent named like this one.
				checkoutId: 'pi_e2e_pay_page',
				clientSecret: 'pi_e2e_pay_page_secret',
				address: `${ORIGIN}/order/${STRIPE_ORDER}/payment/${STRIPE_PAYMENT}/pay`
			}),
			{ upsert: true }
		);
		await db.collection('orders').replaceOne(
			{ _id: SUMUP_ORDER as never },
			orderAwaiting(990012, {
				_id: SUMUP_PAYMENT,
				method: 'card',
				processor: 'sumup',
				checkoutId: 'e2e-sumup-checkout',
				address: `${ORIGIN}/order/${SUMUP_ORDER}/payment/${SUMUP_PAYMENT}/pay`
			}),
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb((db) =>
		db.collection('orders').deleteMany({ _id: { $in: [STRIPE_ORDER, SUMUP_ORDER] as never[] } })
	);
});

/** Stands in for Stripe.js: shows what the form was opened with, and returns like a paid card. */
async function fakeStripeJs(page: Page) {
	await page.route('https://js.stripe.com/v3/', (route) =>
		route.fulfill({
			contentType: 'application/javascript',
			body: `document.documentElement.dataset.stripeJs = 'loaded';
			window.Stripe = (publicKey) => ({
				elements: (options) => ({
					create: () => ({
						mount: (selector) => {
							document.querySelector(selector).textContent =
								'Stripe form ' + publicKey + ' ' + options.clientSecret;
						}
					})
				}),
				confirmPayment: (options) => {
					window.location.assign(options.confirmParams.return_url);
					return new Promise(() => {});
				}
			});`
		})
	);
}

/** Stands in for the SumUp card widget: shows the checkout it was mounted on. */
async function fakeSumUpSdk(page: Page) {
	await page.route('https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js', (route) =>
		route.fulfill({
			contentType: 'application/javascript',
			body: `window.SumUpCard = {
				mount: (options) => {
					window.sumUpResponse = options.onResponse;
					document.getElementById(options.id).textContent = 'SumUp card ' + options.checkoutId;
				}
			};`
		})
	);
}

test('the order page links a card payment to its form, under the logo of its processor', async ({
	page
}) => {
	await page.goto(`/order/${STRIPE_ORDER}`);
	const stripeLink = page.locator(`a[href="/order/${STRIPE_ORDER}/payment/${STRIPE_PAYMENT}/pay"]`);
	await expect(stripeLink).toContainText('Click here to pay by card with');
	await expect(
		stripeLink.locator('svg.order-creditCard-svg[viewBox="0 0 32 32"] path')
	).toHaveCount(1);

	await page.goto(`/order/${SUMUP_ORDER}`);
	const sumupLink = page.locator(`a[href="/order/${SUMUP_ORDER}/payment/${SUMUP_PAYMENT}/pay"]`);
	await expect(
		sumupLink.locator('svg.order-creditCard-svg[viewBox="0 0 214 63"] path')
	).toHaveCount(6);
	// Drawn, not merely present: an empty or mis-namespaced logo has no size.
	expect((await sumupLink.locator('svg').boundingBox())?.width).toBeGreaterThan(48);
});

test('the SumUp form opens on the checkout of the payment and returns to the order', async ({
	page
}) => {
	await fakeSumUpSdk(page);
	// From the link, as a buyer does: the form is then fetched by the page already open.
	await page.goto(`/order/${SUMUP_ORDER}`, { waitUntil: 'networkidle' });
	await page.locator(`a[href="/order/${SUMUP_ORDER}/payment/${SUMUP_PAYMENT}/pay"]`).click();

	await expect(page.locator('#payment-element.sumup')).toHaveText('SumUp card e2e-sumup-checkout');

	await page.evaluate(() =>
		(window as unknown as { sumUpResponse: (type: string) => void }).sumUpResponse('success')
	);
	// Back on the order, told which payment the buyer has just made.
	await expect(page).toHaveURL(`/order/${SUMUP_ORDER}?paymentReturn=${SUMUP_PAYMENT}`);
});

test('the SumUp form returns to where the buyer came from', async ({ page }) => {
	await fakeSumUpSdk(page);
	await page.goto(`/order/${SUMUP_ORDER}/payment/${SUMUP_PAYMENT}/pay?returnTo=%2Fpos%2Ftouch`);
	await expect(page.locator('#payment-element.sumup')).toHaveText('SumUp card e2e-sumup-checkout');

	await page.evaluate(() =>
		(window as unknown as { sumUpResponse: (type: string) => void }).sumUpResponse('success')
	);
	await expect(page).toHaveURL(
		`/order/${SUMUP_ORDER}?paymentReturn=${SUMUP_PAYMENT}&returnTo=%2Fpos%2Ftouch`
	);
});

test('the Stripe form opens with the keys of the shop and returns to the order', async ({
	page
}) => {
	await page.goto('/admin/stripe', { waitUntil: 'networkidle' });
	await expect(page.getByLabel('Secret Key')).toHaveAttribute('placeholder', 'sk_...');
	await expect(page.getByLabel('Public Key')).toHaveAttribute('placeholder', 'pk_...');

	try {
		await page.getByLabel('Secret Key').fill('sk_test_e2e');
		await page.getByLabel('Public Key').fill('pk_test_e2e');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByLabel('Public Key')).toHaveValue('pk_test_e2e');

		await fakeStripeJs(page);
		await page.goto(`/order/${STRIPE_ORDER}/payment/${STRIPE_PAYMENT}/pay`);

		await expect(page.locator('form.payment-form #payment-element.stripe')).toHaveText(
			'Stripe form pk_test_e2e pi_e2e_pay_page_secret'
		);
		const pay = page.locator('form.payment-form button[type="submit"]');
		// The button waits three seconds for the form to render.
		await expect(pay).toBeEnabled({ timeout: 15_000 });

		await pay.click();
		await expect(page).toHaveURL(`/order/${STRIPE_ORDER}?paymentReturn=${STRIPE_PAYMENT}`);
	} finally {
		// Saved keys make Stripe a card processor of the shop for every spec that follows.
		await page.goto('/admin/stripe', { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await expect(page.getByLabel('Public Key')).toHaveValue('');
});

test('a Stripe payment the shop can no longer check keeps its form closed', async ({ page }) => {
	await fakeStripeJs(page);
	await page.goto(`/order/${STRIPE_ORDER}/payment/${STRIPE_PAYMENT}/pay`);

	// The form opens, or not, as soon as Stripe.js is there.
	await expect(page.locator('html[data-stripe-js="loaded"]')).toHaveCount(1);
	await expect(page.locator('form.payment-form #payment-element.stripe')).toHaveText('');
	await expect(page.locator('form.payment-form button[type="submit"]')).toBeDisabled();
});
