import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'osb',
	method: 'osb',
	label: 'OSB',
	priority: 10,
	configKey: 'osb',
	config: {
		fields: {
			shopId: { kind: 'text' },
			password: { kind: 'secret' },
			hmacKey: { kind: 'secret', optional: true }
		}
	}
});
