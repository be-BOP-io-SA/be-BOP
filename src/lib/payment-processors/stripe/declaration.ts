import { defineProcessor, payData } from '../types';

export default defineProcessor({
	slug: 'stripe',
	method: 'card',
	label: 'Stripe',
	priority: 20,
	configKey: 'stripe',
	config: {
		fields: {
			secretKey: { kind: 'secret', prefix: 'sk_' },
			publicKey: { kind: 'text', prefix: 'pk_' },
			currency: { kind: 'currency', default: 'EUR' }
		}
	},
	pay: payData<{ publicKey: string; clientSecret?: string }>()
});
