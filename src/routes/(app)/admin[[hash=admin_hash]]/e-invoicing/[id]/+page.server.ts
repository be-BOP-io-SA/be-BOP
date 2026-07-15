import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export async function load({ params }) {
	const einvoice = await collections.eInvoices.findOne({ _id: new ObjectId(params.id) });
	if (!einvoice) {
		throw error(404, 'E-invoice not found');
	}

	return {
		eInvoice: {
			_id: einvoice._id.toString(),
			orderId: einvoice.orderId,
			orderNumber: einvoice.orderNumber,
			invoiceNumber: einvoice.invoiceNumber,
			country: einvoice.country,
			format: einvoice.format,
			currency: einvoice.currency,
			issueDate: einvoice.issueDate,
			orderCreatedAt: einvoice.orderCreatedAt,
			seller: einvoice.seller,
			buyer: einvoice.buyer,
			lines: einvoice.lines,
			shipping: einvoice.shipping,
			allowance: einvoice.allowance,
			extraCharge: einvoice.extraCharge,
			totals: einvoice.totals,
			vatBreakdown: einvoice.vatBreakdown,
			paidWith: einvoice.paidWith,
			generation: einvoice.generation,
			transmission: einvoice.transmission,
			statusHistory: einvoice.statusHistory,
			artifacts: einvoice.artifacts && {
				xml: { sha256: einvoice.artifacts.xml.sha256, size: einvoice.artifacts.xml.content.length },
				pdf: {
					storage: einvoice.artifacts.pdf.storage,
					size: einvoice.artifacts.pdf.size,
					sha256: einvoice.artifacts.pdf.sha256
				}
			},
			createdAt: einvoice.createdAt
		}
	};
}

export const actions = {
	// Also used to force-regenerate an already-generated invoice (e.g. after a
	// bug fix or a seller identity correction) — not just to retry a failure.
	retry: async ({ params }) => {
		const einvoice = await collections.eInvoices.findOne({ _id: new ObjectId(params.id) });
		if (!einvoice) {
			throw error(404, 'E-invoice not found');
		}

		const now = new Date();
		await collections.eInvoices.updateOne(
			{ _id: einvoice._id },
			{
				$set: {
					'generation.status': 'pending' as const,
					'generation.attempts': 0,
					'generation.nextAttemptAt': now,
					updatedAt: now
				},
				$unset: { 'generation.error': '' },
				$push: {
					statusHistory: {
						at: now,
						kind: 'generation' as const,
						status: 'pending',
						detail:
							einvoice.generation.status === 'generated'
								? 'Manual regeneration from admin'
								: 'Manual retry from admin'
					}
				}
			}
		);

		throw redirect(303, `${adminPrefix()}/e-invoicing/${params.id}`);
	}
};
