import { runtimeConfig } from './runtime-config';

export const isStripeEnabled = () =>
	!!runtimeConfig.stripe.publicKey && !!runtimeConfig.stripe.secretKey;

export async function lastSuccessfulPaymentIntents(): Promise<StripePaymentIntentObject[]> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 1000);
	try {
		const response = await fetch('https://api.stripe.com/v1/events', {
			headers: {
				Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
			},
			signal: controller.signal
		});
		if (!response.ok) {
			throw new Error(
				`Failed to fetch Stripe events: (${response.status}) ${await response.text()}`
			);
		}
		const stripeEventsResponse: StripeEventListResponse = await response.json();
		return stripeEventsResponse.data
			.filter((event): event is StripePaymentIntentSucceededEvent => {
				return event.type === 'payment_intent.succeeded';
			})
			.map((event) => event.data.object);
	} catch (error) {
		throw new Error('Failed to fetch Stripe events', { cause: error });
	} finally {
		clearTimeout(timer);
	}
}

export interface StripePaymentIntentObject {
	id: string;
	object: 'payment_intent';
	amount: number;
	currency: string;
	status: string;
	created: number;
	amount_received: number;
	payment_method: string | null;
	latest_charge: string | null;
}

interface StripePaymentIntentSucceededEvent {
	id: string;
	object: 'event';
	type: 'payment_intent.succeeded';
	created: number;
	data: {
		object: StripePaymentIntentObject;
	};
	livemode: boolean;
}

interface StripeEventListResponse {
	object: 'list';
	data: Array<StripePaymentIntentSucceededEvent | Record<string, unknown>>;
	has_more: boolean;
	url: string;
}
