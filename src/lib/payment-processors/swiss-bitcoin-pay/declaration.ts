import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'swiss-bitcoin-pay',
	method: 'lightning',
	label: 'Swiss Bitcoin Pay',
	priority: 10,
	configKey: 'swissBitcoinPay',
	config: { fields: { apiKey: { kind: 'secret' } } }
});
