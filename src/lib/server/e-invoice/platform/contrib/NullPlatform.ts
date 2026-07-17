import type { EInvoicePlatform } from '../types';

/**
 * Default no-op platform: invoices are generated and stored but not
 * transmitted anywhere.
 */
export const NullPlatform: EInvoicePlatform = {
	meta: {
		id: 'none',
		label: 'None (no transmission)',
		countries: ['FR']
	},
	isConfigured: () => true,
	submitInvoice: async () => ({ status: 'none' }),
	checkStatus: async (einvoice) => ({ status: einvoice.transmission.status })
};
