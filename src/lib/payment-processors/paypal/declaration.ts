import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'paypal',
	method: 'paypal',
	label: 'Paypal',
	priority: 10,
	configKey: 'paypal',
	config: {
		fields: {
			clientId: { kind: 'text' },
			secret: { kind: 'secret' },
			sandbox: { kind: 'boolean' },
			currency: { kind: 'currency', default: 'EUR' }
		}
	}
});
