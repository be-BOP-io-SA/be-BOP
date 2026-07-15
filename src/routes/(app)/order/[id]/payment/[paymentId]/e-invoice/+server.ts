import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink } from '$lib/server/s3';
import { error, redirect } from '@sveltejs/kit';

/**
 * Customer download of the payment's Factur-X e-invoice. Like the receipt,
 * this relies on the order URL being a capability URL (the _id is a crypto
 * UUID that only the customer knows).
 */
export const GET = async ({ params }) => {
	const einvoice = await collections.eInvoices.findOne({
		orderId: params.id,
		paymentId: params.paymentId
	});
	if (!einvoice || einvoice.generation.status !== 'generated' || !einvoice.artifacts) {
		throw error(404, 'E-invoice not found');
	}

	const filename = `invoice-${einvoice.invoiceNumber}.pdf`;
	const pdf = einvoice.artifacts.pdf;

	if (pdf.storage === 's3' && pdf.key) {
		throw redirect(
			302,
			await getPublicS3DownloadLink(pdf.key, {
				input: { ResponseContentDisposition: `attachment; filename="${filename}"` }
			})
		);
	}

	if (!pdf.data) {
		throw error(404, 'E-invoice not found');
	}
	return new Response(new Uint8Array(pdf.data.buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
