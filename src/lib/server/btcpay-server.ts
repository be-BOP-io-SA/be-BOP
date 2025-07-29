import { runtimeConfig } from './runtime-config';

export function isBtcpayServerConfigured() {
	const config = runtimeConfig.btcpayServer ?? {};
	return !!config.apiKey && !!config.serverUrl && !!config.storeId;
}

export interface CreateLightningInvoiceRequest {
	/** Amount in millisatoshi as a string */
	amount: string;
	/** Description of the invoice in BOLT11 */
	description?: string;
	/** Use a hash of the description instead of the raw description */
	descriptionHashOnly?: boolean;
	/** Expiration time in seconds */
	expiry?: number;
	/** Include private route hints */
	privateRouteHints?: boolean;
}

export type LightningInvoiceStatus = 'Expired' | 'Paid' | 'Unpaid';

export interface LightningInvoiceData {
	id: string;
	/** Invoice status (e.g., New, Paid, Expired) */
	status: LightningInvoiceStatus;
	/** BOLT11 invoice string */
	BOLT11: string;
	/** Unix timestamp when the invoice was paid */
	paidAt?: number | null;
	/** Unix timestamp when the invoice expires */
	expiresAt: number;
	/** Invoice amount in millisatoshi */
	amount: string;
	/** Amount received in millisatoshi */
	amountReceived: string;
	/** Payment hash */
	paymentHash: string;
	/** Payment preimage, only available if status is complete */
	preimage?: string | null;
	/** Custom TLV records for keysend payments */
	customRecords?: Record<string, string> | null;
}

/**
 * Description of an error happening during processing of the request
 */
interface ProblemDetails {
	/** An error code describing the error */
	code: string;

	/** User-friendly error message about the error */
	message: string;
}

export async function btcpayCreateLnInvoice(
	request: CreateLightningInvoiceRequest
): Promise<LightningInvoiceData> {
	if (!isBtcpayServerConfigured()) {
		throw new Error('BTCPay Server is not enabled');
	}
	const config = runtimeConfig.btcpayServer;
	const response = await fetch(
		`${config.serverUrl}/api/v1/stores/${config.storeId}/lightning/BTC/invoices`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `token ${config.apiKey}`,
				'user-agent': `be-BOP`
			},
			body: JSON.stringify(request)
		}
	);

	if (!response.ok) {
		const data: ProblemDetails = await response.json();
		throw new Error(
			`Failed to create lightning invoice (${response.status}): ${data.code}: ${data.message}`
		);
	}
	return await response.json();
}

export async function btcpayGetLnInvoice(invoiceId: string): Promise<LightningInvoiceData> {
	if (!isBtcpayServerConfigured()) {
		throw new Error('BTCPay Server is not enabled');
	}
	const config = runtimeConfig.btcpayServer;
	const response = await fetch(
		`${config.serverUrl}/api/v1/stores/${config.storeId}/lightning/BTC/invoices/${invoiceId}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `token ${config.apiKey}`,
				'user-agent': `be-BOP`
			}
		}
	);

	if (!response.ok) {
		const data: ProblemDetails = await response.json();
		throw new Error(
			`Failed to create lightning invoice (${response.status}): ${data.code}: ${data.message}`
		);
	}
	return await response.json();
}
