import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'bitcoind',
	method: 'bitcoin',
	label: 'Bitcoin core node',
	priority: 20,
	customAdminPage: true
});
