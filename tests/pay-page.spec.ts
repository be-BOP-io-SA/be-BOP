import { expect, test, type Page } from './client-ip.js';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ORIGIN = 'http://localhost:5012';

const STRIPE_ORDER = 'e2e-pay-page-stripe';
const SUMUP_ORDER = 'e2e-pay-page-sumup';
const STRIPE_PAYMENT = new ObjectId();
const SUMUP_PAYMENT = new ObjectId();

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function orderAwaitingCard(
	orderId: string,
	number: number,
	payment: { _id: ObjectId; processor: string; checkoutId: string; clientSecret?: string }
) {
	const createdAt = new Date();
	const price = { amount: 10, currency: 'EUR' };

	return {
		number,
		locale: 'en',
		status: 'pending',
		createdAt,
		updatedAt: createdAt,
		user: {},
		notifications: { paymentStatus: {} },
		items: [
			{
				_id: new ObjectId(),
				product: {
					_id: 'e2e-pay-page-product',
					name: 'E2E product',
					alias: [],
					description: '',
					shortDescription: '',
					type: 'resource',
					price,
					shipping: false,
					preorder: false,
					free: false,
					standalone: false,
					payWhatYouWant: false,
					displayShortDescription: false,
					hideDiscountExpiration: false,
					actionSettings: {
						eShop: { visible: true, canBeAddedToBasket: true },
						retail: { visible: true, canBeAddedToBasket: true },
						googleShopping: { visible: true },
						nostr: { visible: true, canBeAddedToBasket: true }
					},
					createdAt,
					updatedAt: createdAt
				},
				quantity: 1,
				vatRate: 20,
				currencySnapshot: { main: { price }, priceReference: { price } }
			}
		],
		payments: [
			{
				...payment,
				status: 'pending',
				method: 'card',
				price,
				currencySnapshot: { main: { price }, priceReference: { price } },
				createdAt,
				address: `${ORIGIN}/order/${orderId}/payment/${payment._id}/pay`
			}
		],
		currencySnapshot: {
			main: { totalPrice: price, vat: [{ amount: 1.67, currency: 'EUR' }] },
			priceReference: { totalPrice: price }
		}
	};
}

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('orders').replaceOne(
			{ _id: STRIPE_ORDER as never },
			orderAwaitingCard(STRIPE_ORDER, 990011, {
				_id: STRIPE_PAYMENT,
				processor: 'stripe',
				// The web server of the suite answers for a payment intent named like this one.
				checkoutId: 'pi_e2e_pay_page',
				clientSecret: 'pi_e2e_pay_page_secret'
			}),
			{ upsert: true }
		);
		await db.collection('orders').replaceOne(
			{ _id: SUMUP_ORDER as never },
			orderAwaitingCard(SUMUP_ORDER, 990012, {
				_id: SUMUP_PAYMENT,
				processor: 'sumup',
				checkoutId: 'e2e-sumup-checkout'
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
	await expect(page).toHaveURL(`/order/${SUMUP_ORDER}`);
});

test('the SumUp form returns to where the buyer came from', async ({ page }) => {
	await fakeSumUpSdk(page);
	await page.goto(`/order/${SUMUP_ORDER}/payment/${SUMUP_PAYMENT}/pay?returnTo=%2Fpos%2Ftouch`);
	await expect(page.locator('#payment-element.sumup')).toHaveText('SumUp card e2e-sumup-checkout');

	await page.evaluate(() =>
		(window as unknown as { sumUpResponse: (type: string) => void }).sumUpResponse('success')
	);
	await expect(page).toHaveURL(`/order/${SUMUP_ORDER}?returnTo=%2Fpos%2Ftouch`);
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
		await expect(page).toHaveURL(`/order/${STRIPE_ORDER}`);
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
