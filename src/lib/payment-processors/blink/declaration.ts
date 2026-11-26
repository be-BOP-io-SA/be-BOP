import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'blink',
	method: 'lightning',
	label: 'Blink',
	priority: 50,
	configKey: 'blink',
	config: {
		fields: {
			/** user@blink.sv — when set (and no apiKey), auto-detects custodial vs non-custodial (Spark) */
			lnAddress: { kind: 'text', optional: true },
			/** blink_... — when set, uses the API-key custodial GraphQL mode */
			apiKey: { kind: 'secret', optional: true },
			/** Optional wallet id override for API-key mode; empty = account default wallet */
			walletId: { kind: 'text', optional: true }
		}
	}
});
