import { collections } from '$lib/server/database';
import { publicS3Client, secureLink } from '$lib/server/s3';
import { generateId } from '$lib/utils/generateId';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { error } from '@sveltejs/kit';
import * as mimeTypes from 'mime-types';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
const S3_BUCKET = env.S3_BUCKET;

export async function POST({ request }) {
	const body = z
		.object({
			name: z.string().trim().min(1).max(100),
			fileSize: z.number().int().min(1).max(100_000_000),
			fileName: z.string().trim().min(1).max(500),
			productId: z.string().nullable().optional()
		})
		.parse(await request.json());
	if (body.productId) {
		const product = await collections.products.findOne({ _id: body.productId });

		if (!product) {
			throw error(404, 'The associated product does not exist');
		}
	}

	const digitalFileId = generateId(body.name, true);

	const contentType = mimeTypes.lookup(body.fileName);
	const extension = contentType ? mimeTypes.extension(contentType) : '';

	let key;
	if (body.productId) {
		key = `products/${body.productId}/${
			extension ? `${digitalFileId}.${extension}` : digitalFileId
		}`;
	} else {
		key = `digital-files/${extension ? `${digitalFileId}.${extension}` : digitalFileId}`;
	}

	const presignedUrl = secureLink(
		await getSignedUrl(
			publicS3Client,
			new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				...(contentType ? { ContentType: contentType } : {}),
				ContentLength: body.fileSize
			}),
			{ expiresIn: 60 * 60 * 24 }
		),
		{ public: true }
	);

	await collections.pendingDigitalFiles.insertOne({
		_id: digitalFileId,
		name: body.name,
		createdAt: new Date(),
		updatedAt: new Date(),
		storage: {
			size: body.fileSize,
			key
		},
		...(body.productId && { productId: body.productId }),
		secret: crypto.randomUUID()
	});

	return new Response(JSON.stringify({ uploadUrl: presignedUrl, digitalFileId }), {
		headers: { 'Content-Type': 'application/json' }
	});
}
