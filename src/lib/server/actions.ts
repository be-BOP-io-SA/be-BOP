import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { z } from 'zod';

export async function updateLightningInvoiceDescription({ request }: { request: Request }) {
	const formData = await request.formData();
	const parsed = z
		.object({ qrCodeDescription: z.enum(['none', 'brand', 'brandAndOrderNumber', 'orderUrl']) })
		.parse(Object.fromEntries(formData));

	if (parsed.qrCodeDescription !== runtimeConfig.lightningQrCodeDescription) {
		runtimeConfig.lightningQrCodeDescription = parsed.qrCodeDescription;
		await collections.runtimeConfig.updateOne(
			{ _id: 'lightningQrCodeDescription' },
			{
				$set: { data: parsed.qrCodeDescription, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	}
}
