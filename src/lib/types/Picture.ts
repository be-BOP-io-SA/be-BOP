import type { Timestamps } from './Timestamps';
import type { Slider } from './slider';
export const TAGTYPES = ['main', 'full', 'wide', 'slim', 'avatar'] as const;
export type TagType = (typeof TAGTYPES)[number];

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

/**
 * @returns the picture id, or null when the picture could not be stored: callers tell the admin.
 */
export async function preUploadPicture(
	adminPrefix: string,
	file: File,
	opts?: { fileName?: string }
): Promise<string | null> {
	const fileSize = file.size;
	const fileName = opts?.fileName || file.name;

	try {
		const response = await fetch(`${adminPrefix}/picture/prepare`, {
			method: 'POST',
			body: JSON.stringify({
				fileName,
				fileSize
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(await response.text());
		}

		const { uploadUrl, pictureId } = await response.json();

		// A storage refusal often lacks CORS headers, so the browser reports it as a network error.
		const uploadResponse = await fetch(uploadUrl, {
			method: 'PUT',
			body: file
		});

		if (!uploadResponse.ok) {
			throw new Error(await uploadResponse.text());
		}
		return pictureId;
	} catch (err) {
		console.error('Picture upload failed:', err);
		return null;
	}
}
