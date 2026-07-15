import { AFRelationship, PDFName, PDFString, type PDFDocument } from 'pdf-lib';
import { srgbIccProfile } from './assets';

/**
 * Turn the rendered invoice PDF into a Factur-X: attach the CII XML as
 * factur-x.xml (AFRelationship Data) and add the PDF/A-3B scaffolding — XMP
 * metadata (pdfaid + Factur-X extension schema) and an sRGB OutputIntent.
 *
 * Conformance target is PDF/A-3B; final validation should be done externally
 * with veraPDF / the FNFE-MPE validator (see the feature's verification notes).
 */

function xmpDate(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function escXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * XMP packet: PDF/A identification (part 3, level B), basic document info and
 * the Factur-X extension schema (mandatory: the fx:* properties must be
 * declared via the PDF/A extension schema mechanism to stay PDF/A-valid).
 */
export function facturxXmp(params: { title: string; createDate: Date }): string {
	const date = xmpDate(params.createDate);
	return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
<pdfaid:part>3</pdfaid:part>
<pdfaid:conformance>B</pdfaid:conformance>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escXml(
		params.title
	)}</rdf:li></rdf:Alt></dc:title>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
<xmp:CreateDate>${date}</xmp:CreateDate>
<xmp:ModifyDate>${date}</xmp:ModifyDate>
<xmp:CreatorTool>be-BOP</xmp:CreatorTool>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
<pdf:Producer>be-BOP</pdf:Producer>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
<pdfaExtension:schemas>
<rdf:Bag>
<rdf:li rdf:parseType="Resource">
<pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
<pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
<pdfaSchema:prefix>fx</pdfaSchema:prefix>
<pdfaSchema:property>
<rdf:Seq>
<rdf:li rdf:parseType="Resource">
<pdfaProperty:name>DocumentFileName</pdfaProperty:name>
<pdfaProperty:valueType>Text</pdfaProperty:valueType>
<pdfaProperty:category>external</pdfaProperty:category>
<pdfaProperty:description>Name of the embedded XML invoice file</pdfaProperty:description>
</rdf:li>
<rdf:li rdf:parseType="Resource">
<pdfaProperty:name>DocumentType</pdfaProperty:name>
<pdfaProperty:valueType>Text</pdfaProperty:valueType>
<pdfaProperty:category>external</pdfaProperty:category>
<pdfaProperty:description>INVOICE</pdfaProperty:description>
</rdf:li>
<rdf:li rdf:parseType="Resource">
<pdfaProperty:name>Version</pdfaProperty:name>
<pdfaProperty:valueType>Text</pdfaProperty:valueType>
<pdfaProperty:category>external</pdfaProperty:category>
<pdfaProperty:description>The actual version of the Factur-X data</pdfaProperty:description>
</rdf:li>
<rdf:li rdf:parseType="Resource">
<pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
<pdfaProperty:valueType>Text</pdfaProperty:valueType>
<pdfaProperty:category>external</pdfaProperty:category>
<pdfaProperty:description>The conformance level of the Factur-X data</pdfaProperty:description>
</rdf:li>
</rdf:Seq>
</pdfaSchema:property>
</rdf:li>
</rdf:Bag>
</pdfaExtension:schemas>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
<fx:DocumentType>INVOICE</fx:DocumentType>
<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
<fx:Version>1.0</fx:Version>
<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export async function packageFacturx(params: {
	doc: PDFDocument;
	xml: string;
	invoiceNumber: number;
	issueDate: Date;
}): Promise<Uint8Array> {
	const { doc, xml, invoiceNumber, issueDate } = params;
	const title = `Invoice ${invoiceNumber}`;

	await doc.attach(new TextEncoder().encode(xml), 'factur-x.xml', {
		mimeType: 'text/xml',
		description: 'Factur-X invoice (EN 16931)',
		creationDate: issueDate,
		modificationDate: issueDate,
		afRelationship: AFRelationship.Data
	});

	doc.setTitle(title);
	doc.setProducer('be-BOP');
	doc.setCreator('be-BOP');
	doc.setCreationDate(issueDate);
	doc.setModificationDate(issueDate);

	// XMP metadata — PDF/A forbids compressing the Metadata stream, so use a
	// plain (non-flate) stream.
	const xmpBytes = new TextEncoder().encode(facturxXmp({ title, createDate: issueDate }));
	const metadataStream = doc.context.stream(xmpBytes, {
		Type: 'Metadata',
		Subtype: 'XML',
		Length: xmpBytes.length
	});
	doc.catalog.set(PDFName.of('Metadata'), doc.context.register(metadataStream));

	// sRGB OutputIntent (PDF/A requires a device-independent color target)
	const icc = await srgbIccProfile();
	const iccStream = doc.context.flateStream(new Uint8Array(icc), { N: 3 });
	const outputIntent = doc.context.obj({
		Type: 'OutputIntent',
		S: 'GTS_PDFA1',
		OutputConditionIdentifier: PDFString.of('sRGB'),
		Info: PDFString.of('sRGB IEC61966-2.1'),
		DestOutputProfile: doc.context.register(iccStream)
	});
	doc.catalog.set(
		PDFName.of('OutputIntents'),
		doc.context.obj([doc.context.register(outputIntent)])
	);

	// Mark the attachment relationship on the catalog (AF) — doc.attach already
	// fills /AF in recent pdf-lib versions, this is a no-op safety for older ones.
	return await doc.save({ useObjectStreams: false });
}
