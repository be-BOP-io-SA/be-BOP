import { fail } from '@sveltejs/kit';
import * as devalue from 'devalue';
import type { Challenge } from '$lib/types/Challenge.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3_REGION, S3_KEY_ID, S3_KEY_SECRET, S3_BUCKET, SMTP_USER } from '$lib/server/env-config';
import type { Picture } from '$lib/types/Picture';
import type { DigitalFile } from '$lib/types/DigitalFile';
import { sendEmail } from '$lib/server/email.js';
import { z } from 'zod';
import { collections, db } from '$lib/server/database.js';
import { ObjectId } from 'mongodb';
import { runtimeConfig } from '$lib/server/runtime-config.js';

export function load({ url }) {
	return {
		importType: url.searchParams.get('type')
	};
}

export type ImportTypeFilesTypes = 'basic' | 'checkWarn' | 'checkClean';

const IMPORT_TYPE_MAPPINGS = {
	global: [
		'cmsPages',
		'products',
		'runtimeConfig',
		'bootikSubscriptions',
		'paidSubscriptions',
		'challenges'
	],
	catalog: ['products', 'digitalFiles', 'pictures'],
	shopConfig: ['runtimeConfig']
};

export const actions = {
	default: async ({ request }) => {
		const {
			fileToUpload,
			importType,
			importOrders,
			includePastChallenges,
			importFiles,
			importTypeFiles
		} = z
			.object({
				fileToUpload: z.instanceof(File),
				importType: z.enum(['global', 'catalog', 'shopConfig']),
				importOrders: z.boolean({ coerce: true }),
				includePastChallenges: z.boolean({ coerce: true }),
				importFiles: z.boolean({ coerce: true }),
				importTypeFiles: z.enum(['basic', 'checkWarn', 'checkClean']).default('basic')
			})
			.parse(Object.fromEntries(await request.formData()));

		const fileBuffer = await fileToUpload.arrayBuffer();
		const fileText = new TextDecoder().decode(fileBuffer);

		try {
			const fileJson = devalue.parse(fileText);

			const transformedData = jsonToObjectId(fileJson);

			let collections = Object.keys(transformedData as Record<string, unknown>);

			let allowedCollections: string[] = IMPORT_TYPE_MAPPINGS[importType];

			if (importOrders) {
				allowedCollections = [...allowedCollections, 'orders'];
			}

			if (importFiles && importType !== 'catalog') {
				allowedCollections = [...allowedCollections, 'digitalFiles', 'pictures'];
			}

			collections = collections.filter((collectionName) =>
				allowedCollections.includes(collectionName)
			);

			let globalInvalidFiles: string[] = [];
			let warningImageImport: string | undefined = '';
			for (const collectionName of collections) {
				let collectionData = fileJson[collectionName];
				const collection = db.collection(collectionName);

				if (!includePastChallenges && collectionName === 'challenges') {
					const now = new Date();
					collectionData = collectionData.filter(
						(challenge: Challenge) => new Date(challenge.endsAt) > now
					);
				}

				if (collectionName === 'pictures') {
					const pictureResponse = await handleImageImport(collectionData, importTypeFiles);

					collectionData = pictureResponse.formattedCollection;
					globalInvalidFiles = [...globalInvalidFiles, ...pictureResponse.invalidFiles];
				}

				if (collectionName === 'digitalFiles') {
					const digitalFileResponse = await handleDigitalFileImport(
						collectionData,
						importTypeFiles
					);
					collectionData = digitalFileResponse.formattedCollection;
					globalInvalidFiles = [...globalInvalidFiles, ...digitalFileResponse.invalidFiles];
				}

				//Delete all collection
				await collection.deleteMany({});

				//Recreate all collection
				if (collectionData.length > 0) {
					await collection.insertMany(collectionData);
				}
			}

			if (globalInvalidFiles.length) {
				warningImageImport = await alertUser(importTypeFiles, globalInvalidFiles);
			}

			return {
				success: true,
				message: warningImageImport
			};
		} catch (e) {
			console.error('Error parsing JSON', e);

			return fail(400, {
				error: true,
				message: 'Error parsing uploaded JSON'
			});
		}
	}
};

async function handleFilesImport<T extends Picture | DigitalFile>(
	fileData: T[],
	importTypeFiles: ImportTypeFilesTypes | undefined,
	handler: (file: T) => Promise<boolean>
) {
	const validFileData = [];
	const invalidFiles = [];

	for (const file of fileData) {
		const isSuccess = await handler(file);

		if (!isSuccess) {
			invalidFiles.push(JSON.stringify(file));
		}

		if (
			importTypeFiles === 'basic' ||
			importTypeFiles === 'checkWarn' ||
			(importTypeFiles === 'checkClean' && invalidFiles.length === 0)
		) {
			validFileData.push(file);
		}
	}

	return { formattedCollection: validFileData, invalidFiles };
}

async function handleImageImport(
	fileData: Picture[],
	importTypeFiles: ImportTypeFilesTypes | undefined
) {
	return await handleFilesImport(fileData, importTypeFiles, async (file: Picture) => {
		let allSuccess = true;
		allSuccess &&= await uploadFileToS3(file.storage.original.url, file.storage.original.key);

		if (file.storage.formats) {
			for (const format of file.storage.formats) {
				allSuccess = allSuccess && (await uploadFileToS3(format.url, format.key));
			}
		}

		return allSuccess;
	});
}

async function handleDigitalFileImport(
	fileData: DigitalFile[],
	importTypeFiles: ImportTypeFilesTypes | undefined
) {
	return await handleFilesImport(fileData, importTypeFiles, (file: DigitalFile) => {
		return uploadFileToS3(file.storage.url, file.storage.key);
	});
}

async function uploadFileToS3(imageUrl: URL | RequestInfo | undefined, s3Key: string) {
	const s3Client = new S3Client({
		region: S3_REGION,
		credentials: {
			accessKeyId: S3_KEY_ID,
			secretAccessKey: S3_KEY_SECRET
		}
	});

	try {
		const response = await fetch(imageUrl ? imageUrl : '');
		const contentType = response.headers.get('content-type') || undefined;

		if (response.status !== 200) {
			console.error(`Failed to fetch ${imageUrl}. Status code: ${response.status}`);
			return false;
		}

		const arrayBuffer = await response.arrayBuffer();
		const uint8ArrayBuffer = new Uint8Array(arrayBuffer);

		const params = {
			Bucket: S3_BUCKET,
			Key: s3Key,
			Body: uint8ArrayBuffer,
			ContentType: contentType
		};

		await s3Client.send(new PutObjectCommand(params));

		return true;
	} catch (error) {
		console.error('Error in uploadFileToS3:', error);
		return false;
	}
}

async function alertUser(importType: string | undefined, invalidFiles: string[]) {
	if (importType === 'basic' || invalidFiles.length === 0) {
		await sendNotification('SUCCESS : IMPORT', 'The import of the file succeeded');

		return 'success';
	}

	if (importType === 'checkWarn' && invalidFiles.length > 0) {
		await sendNotification(
			'WARNING : URLs ARE NOT ACCESSIBLE',
			`Warning: One or more URLs of ${invalidFiles} are not accessible.`
		);

		return 'warning';
	}

	if (importType === 'checkClean' && invalidFiles.length > 0) {
		await sendNotification(
			'ERROR : URLs ARE NOT ACCESSIBLE',
			`Warning: One or more URLs of ${invalidFiles} are not accessible. We didn't import them.`
		);

		return 'error';
	}
}

async function sendNotification(subject: string, htmlContent: string) {
	await sendEmail({
		to: runtimeConfig.sellerIdentity?.contact.email || SMTP_USER,
		subject: subject,
		html: htmlContent
	});

	await collections.emailNotifications.insertOne({
		_id: new ObjectId(),
		createdAt: new Date(),
		updatedAt: new Date(),
		subject: subject,
		htmlContent: htmlContent,
		dest: runtimeConfig.sellerIdentity?.contact.email || SMTP_USER
	});
}

function jsonToObjectId(obj: unknown, alreadyParsed = new Set<unknown>()): unknown {
	if (obj && typeof obj === 'object') {
		if (alreadyParsed.has(obj)) {
			throw new Error('Cyclic dependency detected');
		}
		alreadyParsed.add(obj);
	}

	if (obj && typeof obj === 'object' && '$oid' in obj) {
		const oidObj = obj as { $oid: string };
		return new ObjectId(oidObj.$oid);
	} else if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			obj[i] = jsonToObjectId(obj[i], alreadyParsed);
		}
	} else if (obj && typeof obj === 'object') {
		const recordObj = obj as Record<string, unknown>;
		for (const key of Object.keys(recordObj)) {
			recordObj[key] = jsonToObjectId(recordObj[key], alreadyParsed);
		}
		return recordObj;
	}

	return obj;
}
