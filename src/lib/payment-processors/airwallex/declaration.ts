import { defineProcessor, payData } from '../types';

export default defineProcessor({
	slug: 'airwallex',
	method: 'card',
	label: 'Airwallex',
	priority: 30,
	configKey: 'airwallex',
	config: {
		fields: {
			clientId: { kind: 'text' },
			apiKey: { kind: 'secret' },
			sandbox: { kind: 'boolean' },
			currency: { kind: 'currency', default: 'EUR' }
		}
	},
	pay: payData<{
		intentId: string;
		clientSecret: string;
		currency: string;
		env: 'demo' | 'prod';
	}>()
});
