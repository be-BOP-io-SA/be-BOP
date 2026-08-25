import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink } from '$lib/server/s3.js';
import type { DigitalFile } from '$lib/types/DigitalFile.js';
import type { Picture } from '$lib/types/Picture.js';
import * as devalue from 'devalue';
import { ObjectId } from 'mongodb';
import type { RequestHandler } from './$types';

//maximum amount of time that is valid for presigned URLs
const ONE_WEEK_IN_SECONDS = 7 * 24 * 3600;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { exportType } = JSON.parse(await request.text());

		const challenges = await collections.challenges.find().toArray();
		const cmsPages = await collections.cmsPages.find().toArray();
		const digitalFiles = await collections.digitalFiles.find().toArray();
		const orders = await collections.orders.find().toArray();
		const pictures = await collections.pictures.find().toArray();
		const products = await collections.products.find().toArray();
		const runtimeConfig = await collections.runtimeConfig.find().toArray();
		const bootikSubscriptions = await collections.bootikSubscriptions.find().toArray();
		const paidSubscriptions = await collections.paidSubscriptions.find().toArray();

		let digitalFilesWithUrl: DigitalFile[] = [];
		if (digitalFiles.length > 0) {
			digitalFilesWithUrl = await Promise.all(digitalFiles.map(addDigitalFileUrl));
		}

		let picturesWithUrl: Picture[] = [];
		if (pictures.length > 0) {
			picturesWithUrl = await Promise.all(pictures.map(addPictureUrls));
		}

		const dataToExport =
			exportType === 'product'
				? { products, digitalFiles: digitalFilesWithUrl, pictures: picturesWithUrl }
				: {
						challenges,
						cmsPages,
						digitalFiles: digitalFilesWithUrl,
						orders,
						pictures: picturesWithUrl,
						products,
						runtimeConfig,
						bootikSubscriptions,
						paidSubscriptions
				  };

		const dataToExportTransformed = objectIdToJson(dataToExport);

		const exportedDatabase = devalue.stringify(dataToExportTransformed);

		return new Response(exportedDatabase, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename=backup.json`
			}
		});
	} catch (error) {
		console.error('An error occurred during export :', error);
		return new Response('An error occurred during export', { status: 500 });
	}
};

const addPictureUrls = async (picture: Picture) => {
	picture.storage.original.url = await getPublicS3DownloadLink(picture.storage.original.key, {
		expiresIn: ONE_WEEK_IN_SECONDS
	});
	const resolvedFormats = await Promise.all(
		picture.storage.formats.map(async (currentFormat) => {
			currentFormat.url = await getPublicS3DownloadLink(currentFormat.key, {
				expiresIn: ONE_WEEK_IN_SECONDS
			});
			return currentFormat;
		})
	);
	picture.storage.formats = resolvedFormats;
	return picture;
};

const addDigitalFileUrl = async (digitalFile: DigitalFile) => {
	digitalFile.storage.url = await getPublicS3DownloadLink(digitalFile.storage.key, {
		expiresIn: ONE_WEEK_IN_SECONDS
	});

	return digitalFile;
};

function objectIdToJson(obj: unknown, alreadyParsed = new Set<unknown>()): unknown {
	if (obj && typeof obj === 'object') {
		if (alreadyParsed.has(obj)) {
			throw new Error('Cyclic dependency detected');
		}
		alreadyParsed.add(obj);
	}

	if (obj instanceof ObjectId) {
		return { $oid: obj.toHexString() };
	} else if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			obj[i] = objectIdToJson(obj[i], alreadyParsed);
		}
	} else if (obj && typeof obj === 'object') {
		const recordObj = obj as Record<string, unknown>;
		for (const key of Object.keys(recordObj)) {
			recordObj[key] = objectIdToJson(recordObj[key], alreadyParsed);
		}
		return recordObj;
	}
	return obj;
}
