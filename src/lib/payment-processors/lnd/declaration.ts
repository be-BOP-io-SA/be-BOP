import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'lnd',
	method: 'lightning',
	label: 'Lightning LND node',
	priority: 40,
	customAdminPage: true
});
