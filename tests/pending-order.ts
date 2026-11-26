import { MongoClient, ObjectId, type Document } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';

export async function withDb<T>(
	run: (db: ReturnType<MongoClient['db']>) => Promise<T>
): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

/** An order of one product, still waiting for the given payment. */
export function orderAwaiting(
	number: number,
	payment: {
		_id: ObjectId;
		method: string;
		processor: string;
		price?: { amount: number; currency: string };
		[field: string]: unknown;
	}
): Document {
	const createdAt = new Date();
	const price = payment.price ?? { amount: 10, currency: 'EUR' };

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
					_id: 'e2e-pending-order-product',
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
				price,
				currencySnapshot: { main: { price }, priceReference: { price } },
				createdAt
			}
		],
		currencySnapshot: {
			main: { totalPrice: price, vat: [{ amount: 0, currency: price.currency }] },
			priceReference: { totalPrice: price }
		}
	};
}
