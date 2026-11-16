import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'taler',
	method: 'taler',
	label: 'Taler',
	priority: 10,
	configKey: 'taler',
	config: {
		fields: {
			backendUrl: { kind: 'text', stripTrailingSlashes: true },
			backendApiKey: { kind: 'secret' },
			currency: { kind: 'currency', default: 'CHF' }
		}
	}
});
