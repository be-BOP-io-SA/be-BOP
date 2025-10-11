import { S3_BUCKET } from '$lib/server/env-config';
import { collections, withTransaction } from '$lib/server/database';
import { s3client } from '$lib/server/s3';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

export async function POST({ request }) {
	const { digitalFileId } = z
		.object({
			digitalFileId: z.string()
		})
		.parse(await request.json());

	const pendingFile = await collections.pendingDigitalFiles.findOne({
		_id: digitalFileId
	});

	if (!pendingFile) {
		throw error(404, 'The associated pending digital file does not exist');
	}

	const info = await s3client.headObject({
		Bucket: S3_BUCKET,
		Key: pendingFile.storage.key
	});

	if (info.ContentLength !== pendingFile.storage.size) {
		throw error(400, 'The file size does not match');
	}

	await withTransaction(async (session) => {
		await collections.pendingDigitalFiles.deleteOne({ _id: pendingFile._id }, { session });

		await collections.digitalFiles.insertOne(
			{
				_id: pendingFile._id,
				name: pendingFile.name,
				createdAt: new Date(),
				updatedAt: new Date(),
				storage: pendingFile.storage,
				...(pendingFile.productId && { productId: pendingFile.productId }),
				secret: crypto.randomUUID()
			},
			{ session }
		);
	});

	return new Response();
}
