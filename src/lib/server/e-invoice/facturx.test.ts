import { describe, it, expect } from 'vitest';
import {
	PDFDocument,
	PDFName,
	PDFDict,
	PDFArray,
	PDFStream,
	PDFHexString,
	decodePDFRawStream,
	PDFRawStream
} from 'pdf-lib';
import { facturxXmp, packageFacturx } from './facturx';

async function makePackagedPdf(): Promise<{ bytes: Uint8Array; loaded: PDFDocument }> {
	const doc = await PDFDocument.create();
	doc.addPage([595.28, 841.89]);
	const bytes = await packageFacturx({
		doc,
		xml: '<?xml version="1.0"?><rsm:CrossIndustryInvoice/>',
		invoiceNumber: 42,
		issueDate: new Date('2026-07-01T10:00:00Z')
	});
	return { bytes, loaded: await PDFDocument.load(bytes) };
}

describe('packageFacturx', () => {
	it('attaches the CII XML as factur-x.xml with AFRelationship Data', async () => {
		const { loaded } = await makePackagedPdf();

		const attachments = loaded.catalog
			.lookup(PDFName.of('Names'), PDFDict)
			.lookup(PDFName.of('EmbeddedFiles'), PDFDict)
			.lookup(PDFName.of('Names'), PDFArray);
		expect(attachments.size()).toBe(2); // [name, filespec]
		expect(attachments.lookup(0, PDFHexString).decodeText()).toBe('factur-x.xml');

		const fileSpec = attachments.lookup(1, PDFDict);
		expect(fileSpec.get(PDFName.of('AFRelationship'))?.toString()).toBe('/Data');
	});

	it('embeds PDF/A-3B XMP metadata with the Factur-X extension schema', async () => {
		const { loaded } = await makePackagedPdf();

		const metadataRef = loaded.catalog.get(PDFName.of('Metadata'));
		expect(metadataRef).toBeDefined();
		const stream = loaded.context.lookup(metadataRef, PDFStream);
		const xmp = Buffer.from(
			stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents()
		).toString('utf8');

		expect(xmp).toContain('<pdfaid:part>3</pdfaid:part>');
		expect(xmp).toContain('<pdfaid:conformance>B</pdfaid:conformance>');
		expect(xmp).toContain('<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>');
		expect(xmp).toContain('<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>');
	});

	it('adds an sRGB OutputIntent', async () => {
		const { loaded } = await makePackagedPdf();

		const outputIntents = loaded.catalog.lookup(PDFName.of('OutputIntents'), PDFArray);
		expect(outputIntents.size()).toBe(1);
		const intent = outputIntents.lookup(0, PDFDict);
		expect(intent.get(PDFName.of('S'))?.toString()).toBe('/GTS_PDFA1');
		expect(intent.get(PDFName.of('DestOutputProfile'))).toBeDefined();
	});
});

describe('facturxXmp', () => {
	it('escapes the title', () => {
		const xmp = facturxXmp({ title: 'Invoice <42> & co', createDate: new Date(0) });
		expect(xmp).toContain('Invoice &lt;42&gt; &amp; co');
	});
});
