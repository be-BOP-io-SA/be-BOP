import { createHash } from 'crypto';
import { Binary, type ObjectId } from 'mongodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, s3IsConfigured } from '$lib/server/s3';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { EInvoice } from '$lib/types/EInvoice';

function sha256(data: Uint8Array | string): string {
	return createHash('sha256').update(data).digest('hex');
}

export function eInvoiceS3Key(eInvoiceId: ObjectId, invoiceNumber: number): string {
	return `e-invoices/${eInvoiceId.toHexString()}/invoice-${invoiceNumber}.pdf`;
}

/**
 * Persist the generated artifacts: XML always inline on the document (a few
 * KB), PDF in S3 when configured, otherwise inline as Binary (invoice PDFs are
 * ~100-300 KB, far below the 16 MB document cap).
 */
export async function storeArtifacts(params: {
	eInvoiceId: ObjectId;
	invoiceNumber: number;
	xml: string;
	pdf: Uint8Array;
}): Promise<NonNullable<EInvoice['artifacts']>> {
	const { eInvoiceId, invoiceNumber, xml, pdf } = params;

	const artifacts: NonNullable<EInvoice['artifacts']> = {
		xml: { content: xml, sha256: sha256(xml) },
		pdf: s3IsConfigured()
			? {
					storage: 's3',
					key: eInvoiceS3Key(eInvoiceId, invoiceNumber),
					size: pdf.length,
					sha256: sha256(pdf)
			  }
			: {
					storage: 'inline',
					data: new Binary(pdf),
					size: pdf.length,
					sha256: sha256(pdf)
			  }
	};

	if (artifacts.pdf.storage === 's3' && artifacts.pdf.key) {
		await getS3Client().send(
			new PutObjectCommand({
				Bucket: runtimeConfig.s3.bucket,
				Key: artifacts.pdf.key,
				Body: pdf,
				ContentType: 'application/pdf'
			})
		);
	}

	return artifacts;
}
