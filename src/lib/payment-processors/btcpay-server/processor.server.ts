import { differenceInSeconds } from 'date-fns';
import { z } from 'zod';
import { runtimeConfig } from '$lib/server/runtime-config';
import { lightningLabel, LIGHTNING } from '$lib/server/sdk/contrib/presentations';
import {
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

function isBtcpayServerConfigured() {
	const config = runtimeConfig.btcpayServer ?? {};
	return !!config.apiKey && !!config.serverUrl && !!config.storeId;
}

interface CreateLightningInvoiceRequest {
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

type LightningInvoiceStatus = 'Expired' | 'Paid' | 'Unpaid';

interface LightningInvoiceData {
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

async function btcpayCreateLnInvoice(
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

async function btcpayGetLnInvoice(invoiceId: string): Promise<LightningInvoiceData> {
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

export default definePaymentProcessor(declaration, {
	...LIGHTNING,

	isEnabled: () => isBtcpayServerConfigured(),

	configSchema: z.object({
		apiKey: z.string().min(1),
		serverUrl: z
			.string()
			.url()
			.refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
				message: 'BTCPay Server URL must specify the http or https protocol'
			})
			.transform((v) => v.replace(/\/\s*$/, '').trim()),
		storeId: z.string().min(1).trim()
	}),

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = params.toPay.amount;
		const label = lightningLabel(params.orderId, params.orderNumber);

		const invoice = await btcpayCreateLnInvoice({
			amount: `${satoshis * 1000}`,
			description: label,
			...(params.expiresAt && {
				expiry: differenceInSeconds(params.expiresAt, new Date())
			})
		});

		return {
			address: invoice.BOLT11,
			invoiceId: invoice.id,
			processor: 'btcpay-server'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on btcpay-server payment');
		}

		const invoice = await btcpayGetLnInvoice(payment.invoiceId);

		switch (invoice.status) {
			case 'Paid':
				return {
					status: 'paid',
					received: {
						amount: Number(invoice.amountReceived) / 1000,
						currency: 'SAT'
					}
				};
			case 'Expired':
				return { status: 'expired' };
			case 'Unpaid':
				return { status: 'pending' };
			default:
				console.log(
					`Unexpected status for BTCPay Server invoice ${payment.invoiceId}: ${invoice.status}`
				);
				invoice.status satisfies never;
				return { status: 'pending' };
		}
	}
});
