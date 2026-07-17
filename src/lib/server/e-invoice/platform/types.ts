import type { EInvoice, EInvoiceCountry, EInvoiceTransmissionStatus } from '$lib/types/EInvoice';

/**
 * Transmission platform (French "Plateforme Agréée" / PDP) adapter interface.
 *
 * The EInvoice document carries everything an adapter needs (externalId,
 * transmission status, statusHistory), so plugging one in requires no schema
 * change. See platform/registry.ts for the registered adapters.
 */
export interface EInvoicePlatform {
	meta: {
		id: string;
		label: string;
		countries: EInvoiceCountry[];
	};
	isConfigured(): boolean;
	submitInvoice(
		einvoice: EInvoice,
		artifacts: { pdf: Uint8Array; xml: string }
	): Promise<{ status: EInvoiceTransmissionStatus; externalId?: string; detail?: string }>;
	checkStatus(einvoice: EInvoice): Promise<{ status: EInvoiceTransmissionStatus; detail?: string }>;
}
