import { error, fail } from '@sveltejs/kit';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import * as devalue from 'devalue';
import type { Challenge } from '$lib/types/Challenge.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { SMTP_USER } from '$lib/server/env-config';
import { getS3Client } from '$lib/server/s3';
import type { Picture } from '$lib/types/Picture';
import type { DigitalFile } from '$lib/types/DigitalFile';
import { sendEmail } from '$lib/server/email.js';
import { z } from 'zod';
import { collections, db } from '$lib/server/database.js';
import { ObjectId } from 'mongodb';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { isPrivateIp } from '$lib/server/webhook-url-guard';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

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

// Restoring this would re-open the unauthenticated first-run admin creation that `/admin/login`
// falls back to: it describes the instance, not the shop, so no backup may carry it.
const NON_RESTORABLE_CONFIG_IDS = ['isAdminCreated'];

export const actions = {
	default: async ({ request, locals }) => {
		// An import rewrites runtimeConfig wholesale — signing keys and payment credentials
		// included — so it is the same privilege as exporting one.
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can import a backup!');
		}

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

				//Delete all collection, keeping the config documents no backup may carry
				if (collectionName === 'runtimeConfig') {
					collectionData = collectionData.filter(
						(doc: { _id?: string }) => !NON_RESTORABLE_CONFIG_IDS.includes(doc._id ?? '')
					);
					await db
						.collection<{ _id: string }>(collectionName)
						.deleteMany({ _id: { $nin: NON_RESTORABLE_CONFIG_IDS } });
				} else {
					await collection.deleteMany({});
				}

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
		allSuccess &&= await uploadFileToS3(
			file.storage.original.url,
			file.storage.original.key,
			'image/webp'
		);

		if (file.storage.formats) {
			for (const format of file.storage.formats) {
				allSuccess = allSuccess && (await uploadFileToS3(format.url, format.key, 'image/webp'));
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
		// Downloads are served as an attachment, never rendered, so one opaque type fits all.
		return uploadFileToS3(file.storage.url, file.storage.key, 'application/octet-stream');
	});
}

// The bytes and the key both come out of an externally-authored backup file, so neither the
// remote's content type nor an arbitrary key may be taken at face value: the first would let an
// imported object be served as HTML from our own origin, the second would let it land on top of
// an existing one.
const IMPORTABLE_KEY_PREFIXES = ['pictures/', 'products/', 'tags/', 'galleries/', 'digital-files/'];

/**
 * The source URL is authored by the backup file too, so fetching it unchecked turns the import
 * into a read proxy into our own network — the fetched bytes end up publicly served under
 * `/picture/raw`. Unlike a webhook target, http is allowed: an S3-compatible store on the LAN is
 * a normal deployment, so only the address is vetted, not the scheme.
 */
async function assertPublicImportSource(rawUrl: string): Promise<void> {
	const url = new URL(rawUrl);

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`Refusing to import from a non-http(s) URL: ${url.protocol}`);
	}

	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
		throw new Error(`Refusing to import from ${host}`);
	}

	if (isIP(host)) {
		if (isPrivateIp(host)) {
			throw new Error(`Refusing to import from a private address: ${host}`);
		}
		return;
	}

	for (const { address } of await lookup(host, { all: true })) {
		if (isPrivateIp(address)) {
			throw new Error(`Refusing to import from ${host}, which resolves to ${address}`);
		}
	}
}

async function uploadFileToS3(
	imageUrl: URL | RequestInfo | undefined,
	s3Key: string,
	contentType: string
) {
	try {
		if (
			!IMPORTABLE_KEY_PREFIXES.some((prefix) => s3Key.startsWith(prefix)) ||
			s3Key.includes('..')
		) {
			console.error(`Refusing to import into an unexpected S3 key: ${s3Key}`);
			return false;
		}

		await assertPublicImportSource(String(imageUrl ?? ''));

		// A public host must not be able to bounce the request onto an internal one.
		const response = await fetch(imageUrl ? imageUrl : '', { redirect: 'error' });

		if (response.status !== 200) {
			console.error(`Failed to fetch ${imageUrl}. Status code: ${response.status}`);
			return false;
		}

		const arrayBuffer = await response.arrayBuffer();
		const uint8ArrayBuffer = new Uint8Array(arrayBuffer);

		const params = {
			Bucket: runtimeConfig.s3.bucket,
			Key: s3Key,
			Body: uint8ArrayBuffer,
			ContentType: contentType
		};

		await getS3Client().send(new PutObjectCommand(params));

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
