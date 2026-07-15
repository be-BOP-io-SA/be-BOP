import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export const GET = async ({ params }) => {
	const einvoice = await collections.eInvoices.findOne({ _id: new ObjectId(params.id) });
	if (!einvoice?.artifacts) {
		throw error(404, 'E-invoice XML not found');
	}

	return new Response(einvoice.artifacts.xml.content, {
		headers: {
			'Content-Type': 'application/xml',
			'Content-Disposition': `attachment; filename="factur-x-${einvoice.invoiceNumber}.xml"`
		}
	});
};
