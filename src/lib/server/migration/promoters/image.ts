import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import * as mimeTypes from 'mime-types';
import { collections } from '../../database';
import { getS3Client } from '../../s3';
import { runtimeConfig } from '../../runtime-config';
import type { ImageData, Picture } from '$lib/types/Picture';
import type { MigrationPromoter } from '../promoter';

interface NormalizedImage {
	url?: string;
	mimeType?: string;
	alt?: string;
	title?: string;
	caption?: string;
	width?: number;
	height?: number;
	slug?: string;
}

/**
 * Download an image from a remote URL, generate WebP variants, upload to S3,
 * and create a Picture document. Returns the Picture._id.
 *
 * Mirrors the post-`generatePicture` half of $lib/server/picture but starts
 * from a Buffer instead of a pendingPicture so the migration can run
 * server-to-server without going through the admin upload UI.
 */
export async function importImageFromUrl(input: {
	url: string;
	name: string;
	productId?: string;
}): Promise<string> {
	const _id = crypto.randomUUID();

	const resp = await fetch(input.url);
	if (!resp.ok) {
		throw new Error(`Could not download image (${input.url}): HTTP ${resp.status}`);
	}
	const buffer = Buffer.from(await resp.arrayBuffer());
	if (buffer.length > 10 * 1024 * 1024) {
		throw new Error(`Image too big (${buffer.length} bytes, max 10MB): ${input.url}`);
	}

	const image = sharp(buffer);
	const { width, height, format } = await image.metadata();
	if (!width || !height) {
		throw new Error(`Invalid image (no width/height): ${input.url}`);
	}
	if (!format) {
		throw new Error(`Invalid image format: ${input.url}`);
	}
	const mime = mimeTypes.lookup(format);
	if (!mime) {
		throw new Error(`Unrecognized image format "${format}": ${input.url}`);
	}
	const extension = '.' + mimeTypes.extension(mime);

	const pathPrefix = input.productId ? `products/${input.productId}/` : 'pictures/';
	const originalKey = `${pathPrefix}${_id}${extension}`;
	const uploadedKeys: string[] = [];

	try {
		await getS3Client().send(
			new PutObjectCommand({
				Bucket: runtimeConfig.s3.bucket,
				Key: originalKey,
				Body: buffer,
				ContentType: mime
			})
		);
		uploadedKeys.push(originalKey);

		const original: ImageData = {
			key: originalKey,
			width,
			height,
			size: buffer.length
		};
		const formats: ImageData[] = [];

		// Same-size WebP variant if the original fits.
		if (width <= 2048 && height <= 2048) {
			const key = `${pathPrefix}${_id}-${width}x${height}.webp`;
			const webp = await image.toFormat('webp').toBuffer();
			await getS3Client().send(
				new PutObjectCommand({
					Bucket: runtimeConfig.s3.bucket,
					Key: key,
					Body: webp,
					ContentType: 'image/webp'
				})
			);
			uploadedKeys.push(key);
			formats.push({ key, width, height, size: webp.length });
		}

		for (const size of [2048, 1024, 512, 256, 128]) {
			if (width > size || height > size) {
				const resized = await image
					.resize(width > height ? { width: size } : { height: size })
					.toFormat('webp')
					.toBuffer();
				const meta = await sharp(resized).metadata();
				if (!meta.width || !meta.height) {
					throw new Error('Could not get resized dimensions');
				}
				const key = `${pathPrefix}${_id}-${meta.width}x${meta.height}.webp`;
				await getS3Client().send(
					new PutObjectCommand({
						Bucket: runtimeConfig.s3.bucket,
						Key: key,
						Body: resized,
						ContentType: 'image/webp'
					})
				);
				uploadedKeys.push(key);
				formats.push({ key, width: meta.width, height: meta.height, size: resized.length });
			}
		}

		const picture: Picture = {
			_id,
			name: input.name,
			storage: { original, formats },
			...(input.productId ? { productId: input.productId } : {}),
			createdAt: new Date(),
			updatedAt: new Date()
		};
		await collections.pictures.insertOne(picture);
		return _id;
	} catch (err) {
		// Best-effort cleanup of partial S3 uploads.
		for (const key of uploadedKeys) {
			await getS3Client()
				.send(new DeleteObjectCommand({ Bucket: runtimeConfig.s3.bucket, Key: key }))
				.catch(() => {});
		}
		throw err;
	}
}

export const imagePromoter: MigrationPromoter = {
	type: 'image',
	actionLabel: 'Import image to be-BOP',

	async promote(staged) {
		const n = (staged.normalized ?? {}) as NormalizedImage;
		if (!n.url) {
			throw new Error('Staged image has no source URL');
		}
		const name = n.title || n.alt || n.slug || `imported-${staged.sourceId}`;
		const pictureId = await importImageFromUrl({ url: n.url, name });
		return {
			promotedAsId: pictureId,
			promotedAsLabel: name
		};
	}
};
