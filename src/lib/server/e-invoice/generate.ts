import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { EInvoice } from '$lib/types/EInvoice';
import type { SellerIdentity } from '$lib/types/SellerIdentity';
import { buildInvoiceContext, type InvoiceContext } from './context';
import { ciiXml } from './cii';
import { renderInvoicePdf } from './pdf';
import { packageFacturx } from './facturx';
import { storeArtifacts } from './storage';
import { getPlatform } from './platform/registry';

/**
 * Seller identity for the invoice: the order's snapshot, with the legal block
 * merged from the current runtimeConfig when the snapshot predates the legal
 * fields (they were added for e-invoicing).
 */
function resolveSeller(snapshot: SellerIdentity | null): SellerIdentity {
	const seller = snapshot ?? runtimeConfig.sellerIdentity;
	if (!seller) {
		throw new Error('No seller identity configured (see /admin/identity)');
	}
	if (!seller.legal && runtimeConfig.sellerIdentity?.legal) {
		return { ...seller, legal: runtimeConfig.sellerIdentity.legal };
	}
	return seller;
}

/**
 * Generate the e-invoice document: map the order to the EN16931 model, build
 * CII XML + PDF, package as Factur-X (PDF/A-3B), store artifacts, then hand
 * off to the configured transmission platform.
 *
 * Called by the e-invoice worker; throwing here surfaces as a retryable
 * generation failure on the document.
 */
export async function generateEInvoice(einvoice: EInvoice): Promise<void> {
	const order = await collections.orders.findOne({ _id: einvoice.orderId });
	if (!order) {
		throw new Error(`Order ${einvoice.orderId} not found`);
	}
	const payment = order.payments.find((p) => p._id.toString() === einvoice.paymentId);
	if (!payment) {
		throw new Error(`Payment ${einvoice.paymentId} not found on order ${einvoice.orderId}`);
	}

	let ctx: InvoiceContext;
	switch (einvoice.country) {
		case 'FR':
			ctx = buildInvoiceContext({
				order,
				payment,
				seller: resolveSeller(order.sellerIdentity),
				country: einvoice.country
			});
			break;
		default:
			einvoice.country satisfies never;
			throw new Error(`Unsupported e-invoicing country: ${einvoice.country}`);
	}

	const xml = ciiXml(ctx);
	const doc = await renderInvoicePdf(ctx);
	const pdf = await packageFacturx({
		doc,
		xml,
		invoiceNumber: ctx.invoiceNumber,
		issueDate: ctx.issueDate
	});
	const artifacts = await storeArtifacts({
		eInvoiceId: einvoice._id,
		invoiceNumber: einvoice.invoiceNumber,
		xml,
		pdf
	});

	const now = new Date();
	await collections.eInvoices.updateOne(
		{ _id: einvoice._id },
		{
			$set: {
				currency: ctx.currency,
				issueDate: ctx.issueDate,
				orderCreatedAt: ctx.orderCreatedAt,
				seller: ctx.seller,
				buyer: ctx.buyer,
				lines: ctx.lines,
				...(ctx.shipping && { shipping: ctx.shipping }),
				discount: ctx.discount,
				rounding: ctx.rounding,
				totals: {
					exclVat: ctx.totals.exclVat,
					vat: ctx.totals.vat,
					inclVat: ctx.totals.inclVat,
					prepaid: ctx.totals.prepaid,
					due: ctx.totals.due
				},
				vatBreakdown: ctx.vatBreakdown.map(({ rate, country, amount }) => ({
					rate,
					country,
					amount
				})),
				paidWith: {
					method: ctx.paidWith.method,
					...(ctx.paidWith.posSubtype && { posSubtype: ctx.paidWith.posSubtype }),
					...(ctx.paidWith.methodLabel && { methodLabel: ctx.paidWith.methodLabel }),
					paidAt: ctx.paidWith.paidAt,
					amount: ctx.paidWith.amount,
					display: ctx.paidWith.display,
					fiatEquivalent: ctx.paidWith.fiatEquivalent,
					...(ctx.paidWith.rate && { rate: ctx.paidWith.rate })
				},
				artifacts,
				'generation.status': 'generated' as const,
				'generation.generatedAt': now,
				updatedAt: now
			},
			$unset: { 'generation.error': '' },
			$push: {
				statusHistory: { at: now, kind: 'generation' as const, status: 'generated' }
			}
		}
	);

	await submitToTransmissionPlatform(einvoice._id, { pdf, xml });
}

/**
 * Hand the generated invoice to the configured transmission platform. A
 * failure here never fails the generation (the invoice exists either way) —
 * it's recorded as a transmission error and can be retried once real platform
 * reconciliation lands.
 */
export async function submitToTransmissionPlatform(
	eInvoiceId: EInvoice['_id'],
	artifacts: { pdf: Uint8Array; xml: string }
): Promise<void> {
	const einvoice = await collections.eInvoices.findOne({ _id: eInvoiceId });
	if (!einvoice) {
		return;
	}
	const platform = getPlatform(einvoice.transmission.platform);
	if (platform.meta.id === 'none') {
		return;
	}
	const now = new Date();
	try {
		const result = await platform.submitInvoice(einvoice, artifacts);
		await collections.eInvoices.updateOne(
			{ _id: eInvoiceId },
			{
				$set: {
					'transmission.status': result.status,
					...(result.externalId && { 'transmission.externalId': result.externalId }),
					updatedAt: now
				},
				$push: {
					statusHistory: {
						at: now,
						kind: 'transmission' as const,
						status: result.status,
						...(result.detail && { detail: result.detail })
					}
				}
			}
		);
	} catch (err) {
		await collections.eInvoices.updateOne(
			{ _id: eInvoiceId },
			{
				$set: { 'transmission.status': 'error' as const, updatedAt: now },
				$push: {
					statusHistory: {
						at: now,
						kind: 'transmission' as const,
						status: 'error',
						detail: err instanceof Error ? err.message : String(err)
					}
				}
			}
		);
	}
}
