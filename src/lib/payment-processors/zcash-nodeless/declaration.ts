import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'zcash-nodeless',
	method: 'zcash',
	label: 'Zcash nodeless',
	priority: 10,
	configKey: 'zcashNodeless',
	// The key, the servers and the address preview need checks no shared form can run.
	customAdminPage: true
});
