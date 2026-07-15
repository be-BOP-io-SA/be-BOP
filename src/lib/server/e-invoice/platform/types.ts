import type { EInvoice, EInvoiceCountry, EInvoiceTransmissionStatus } from '$lib/types/EInvoice';

/**
 * Transmission platform (French "Plateforme Agréée" / PDP) adapter interface.
 *
 * Only the no-op NullPlatform exists until an accredited platform API is
 * integrated; the EInvoice document already carries everything a real adapter
 * needs (externalId, transmission status, statusHistory), so plugging one in
 * requires no schema change.
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
