import { collections } from '$lib/server/database';
import {
	E_INVOICE_GENERATION_STATUSES,
	E_INVOICE_TRANSMISSION_STATUSES,
	type EInvoice
} from '$lib/types/EInvoice';
import type { Filter } from 'mongodb';
import { z } from 'zod';

const E_INVOICE_PAGINATION_LIMIT = 50;

export async function load({ url }) {
	const querySchema = z.object({
		skip: z.number({ coerce: true }).int().min(0).optional().default(0),
		status: z.enum(['' as const, ...E_INVOICE_GENERATION_STATUSES]).optional(),
		transmissionStatus: z.enum(['' as const, ...E_INVOICE_TRANSMISSION_STATUSES]).optional(),
		orderNumber: z.number({ coerce: true }).int().min(0).optional(),
		invoiceNumber: z.number({ coerce: true }).int().min(0).optional()
	});

	const result = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
	const { skip, status, transmissionStatus, orderNumber, invoiceNumber } = result;

	const query: Filter<EInvoice> = {};
	if (status) {
		query['generation.status'] = status;
	}
	if (transmissionStatus) {
		query['transmission.status'] = transmissionStatus;
	}
	if (orderNumber) {
		query.orderNumber = orderNumber;
	}
	if (invoiceNumber) {
		query.invoiceNumber = invoiceNumber;
	}

	const eInvoices = await collections.eInvoices
		.find(query)
		.skip(skip)
		.limit(E_INVOICE_PAGINATION_LIMIT)
		.sort({ createdAt: -1 })
		.toArray();

	return {
		eInvoices: eInvoices.map((einvoice) => ({
			_id: einvoice._id.toString(),
			orderId: einvoice.orderId,
			orderNumber: einvoice.orderNumber,
			invoiceNumber: einvoice.invoiceNumber,
			country: einvoice.country,
			currency: einvoice.currency,
			buyerName: einvoice.buyer?.name,
			totalInclVat: einvoice.totals?.inclVat,
			generationStatus: einvoice.generation.status,
			transmissionStatus: einvoice.transmission.status,
			hasArtifacts: !!einvoice.artifacts,
			createdAt: einvoice.createdAt
		}))
	};
}
