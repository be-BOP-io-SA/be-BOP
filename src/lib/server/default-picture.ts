import { error } from '@sveltejs/kit';
import DEFAULT_PRODUCT_PICTURE from '$lib/assets/default-picture.png';
import DEFAULT_EVENT_PICTURE from '$lib/assets/event-default-picture.png';
import { collections } from '$lib/server/database';
import { deletePicture, storePicture } from '$lib/server/picture';
import { runtimeConfig } from '$lib/server/runtime-config';
import { getPublicS3DownloadLink } from '$lib/server/s3';
import { generateId } from '$lib/utils/generateId';
import { PICTURE_UPLOAD_TYPES } from '$lib/types/Picture';

export const DEFAULT_PICTURES = {
	'default-picture.png': {
		configKey: 'defaultProductPictureId',
		name: 'Default product picture',
		bundled: DEFAULT_PRODUCT_PICTURE
	},
	'event-default-picture.png': {
		configKey: 'defaultEventPictureId',
		name: 'Default event picture',
		bundled: DEFAULT_EVENT_PICTURE
	}
} as const;

export type DefaultPictureFile = keyof typeof DEFAULT_PICTURES;

export function isDefaultPictureFile(file: string): file is DefaultPictureFile {
	return Object.hasOwn(DEFAULT_PICTURES, file);
}

export async function defaultPictureUrl(file: DefaultPictureFile): Promise<string> {
	const { configKey, bundled } = DEFAULT_PICTURES[file];
	const pictureId = runtimeConfig[configKey];
	// The picture may have been deleted from the picture list since it was uploaded.
	const picture = pictureId ? await collections.pictures.findOne({ _id: pictureId }) : null;

	return picture ? getPublicS3DownloadLink(picture.storage.formats[0].key) : bundled;
}

export async function replaceDefaultPicture(file: DefaultPictureFile, request: Request) {
	const upload = (await request.formData()).get('file');

	if (!upload || !(upload instanceof File)) {
		throw error(400, 'No file provided or invalid file format.');
	}

	if (!PICTURE_UPLOAD_TYPES.some((type) => type === upload.type)) {
		throw error(400, 'Unsupported file type.');
	}

	const { configKey, name } = DEFAULT_PICTURES[file];
	const previousId = runtimeConfig[configKey];
	const _id = generateId(name, true);

	await storePicture(
		{ _id, name, upload: Buffer.from(await upload.arrayBuffer()) },
		{
			cb: async (session) => {
				await collections.runtimeConfig.updateOne(
					{ _id: configKey },
					{ $set: { data: _id, updatedAt: new Date() } },
					{ upsert: true, session }
				);
			}
		}
	);
	runtimeConfig[configKey] = _id;

	if (previousId) {
		await deletePicture(previousId);
	}
}
