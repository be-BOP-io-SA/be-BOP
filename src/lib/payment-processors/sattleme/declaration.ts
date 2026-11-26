import { defineProcessor } from '../types';

/**
 * sattle.me's Lightning side. Its settings also serve `sattleme-onchain`, the same integration
 * taking the Bitcoin method: one integration key per shop, whatever the method.
 */
export default defineProcessor({
	slug: 'sattleme',
	method: 'lightning',
	label: 'sattle.me',
	// After every processor a shop may already use: configuring it never takes their traffic
	// unless the shop prefers it in Settings > General.
	priority: 60,
	configKey: 'sattleme',
	config: {
		fields: {
			/** The integration's secret key, from "Integrations" in the merchant's sattle.me app. */
			integrationKey: { kind: 'secret', prefix: 'sattleme_ck_' },
			/** Also take the Bitcoin method, paid on-chain to the deposit addresses of the integration's lot. */
			onchain: { kind: 'boolean' }
		}
	}
});
