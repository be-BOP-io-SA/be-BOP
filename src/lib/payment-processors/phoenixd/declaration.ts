import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'phoenixd',
	method: 'lightning',
	label: 'PhoenixD',
	priority: 30,
	configKey: 'phoenixd',
	customAdminPage: true
});
