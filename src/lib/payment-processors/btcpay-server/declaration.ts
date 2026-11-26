import { defineProcessor } from '../types';

export default defineProcessor({
	slug: 'btcpay-server',
	method: 'lightning',
	label: 'BTCPay Server',
	priority: 20,
	configKey: 'btcpayServer',
	config: {
		fields: {
			serverUrl: { kind: 'text' },
			storeId: { kind: 'text' },
			apiKey: { kind: 'secret' }
		}
	}
});
