import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink } from '$lib/server/s3';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';

export const GET = async ({ params }) => {
	const einvoice = await collections.eInvoices.findOne({ _id: new ObjectId(params.id) });
	if (!einvoice?.artifacts) {
		throw error(404, 'E-invoice PDF not found');
	}

	const filename = `invoice-${einvoice.invoiceNumber}.pdf`;
	const pdf = einvoice.artifacts.pdf;

	if (pdf.storage === 's3' && pdf.key) {
		// Short-lived presigned link; only reachable through admin auth
		throw redirect(
			302,
			await getPublicS3DownloadLink(pdf.key, {
				input: { ResponseContentDisposition: `attachment; filename="${filename}"` }
			})
		);
	}

	if (!pdf.data) {
		throw error(404, 'E-invoice PDF not found');
	}
	return new Response(new Uint8Array(pdf.data.buffer), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
