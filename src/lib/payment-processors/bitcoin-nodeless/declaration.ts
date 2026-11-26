import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'bitcoin-nodeless',
	method: 'bitcoin',
	label: 'Bitcoin nodeless',
	priority: 10,
	configKey: 'bitcoinNodeless',
	customAdminPage: true
});
