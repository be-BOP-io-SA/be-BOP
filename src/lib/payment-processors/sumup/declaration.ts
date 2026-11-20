import { defineProcessor, payData } from '../types';

export default defineProcessor({
	slug: 'sumup',
	method: 'card',
	label: 'SumUp',
	priority: 10,
	configKey: 'sumUp',
	config: {
		fields: {
			apiKey: { kind: 'secret', prefix: 'sup_sk_' },
			merchantCode: { kind: 'text' },
			currency: { kind: 'currency', default: 'EUR' }
		}
	},
	pay: payData<{ checkoutId?: string }>()
});
