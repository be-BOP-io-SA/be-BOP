import type { Timestamps } from './Timestamps';
import type { Slider } from './slider';
import { sendToStorage, type StorageUploadFailure } from '$lib/utils/sendToStorage';
export const TAGTYPES = ['main', 'full', 'wide', 'slim', 'avatar'] as const;
export type TagType = (typeof TAGTYPES)[number];

// One list for every picture file picker, and for any server check of the type, so they cannot drift.
export const PICTURE_UPLOAD_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif',
	'image/svg+xml'
] as const;
export const PICTURE_UPLOAD_ACCEPT = PICTURE_UPLOAD_TYPES.join(',');

export interface ImageData {
	key: string;
	width: number;
	height: number;
	size: number;
	url?: string;
}

export interface Picture extends Timestamps {
	_id: string;
	order?: number;
	productId?: string;
	tag?: {
		_id: string;
		type: 'main' | 'full' | 'wide' | 'slim' | 'avatar';
	};
	slider?: {
		_id: Slider['_id'];
		url?: string;
		openNewTab?: boolean;
	};
	name: string;
	galleryId?: string;
	schedule?: {
		_id: string;
		eventSlug: string;
	};
	storage: {
		original: ImageData;
		formats: ImageData[];
	};
}

export const MAX_PICTURE_SIZE = 20_000_000;

/** Callers tell the admin about a failure with {@link pictureUploadFailureMessage}. */
export async function preUploadPicture(
	adminPrefix: string,
	file: File,
	opts?: { fileName?: string }
): Promise<{ pictureId: string } | { failure: StorageUploadFailure }> {
	const sent = await sendToStorage<{ uploadUrl: string; pictureId: string }>(file, {
		url: `${adminPrefix}/picture/prepare`,
		body: { fileName: opts?.fileName || file.name, fileSize: file.size },
		maxSize: MAX_PICTURE_SIZE
	});
	return 'failure' in sent ? sent : { pictureId: sent.prepared.pictureId };
}

export function pictureUploadFailureMessage(
	t: (key: string, params?: Record<string, number>) => string,
	failure: StorageUploadFailure
): string {
	switch (failure) {
		case 'tooLarge':
			return t('admin.picture.uploadTooLarge', { max: MAX_PICTURE_SIZE / 1_000_000 });
		case 'sessionExpired':
			return t('admin.picture.uploadSessionExpired');
		case 'storageRefused':
			return t('admin.picture.uploadFailed');
	}
}
