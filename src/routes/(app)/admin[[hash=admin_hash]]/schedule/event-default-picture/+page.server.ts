import { error, redirect } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import path from 'path';
import { join } from 'path';
import sharp from 'sharp';
import { rootDir } from '$lib/server/root-dir';
import { adminPrefix } from '$lib/server/admin';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file');

		if (!file || !(file instanceof File)) {
			throw error(400, 'No file provided or invalid file format.');
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			throw error(400, 'Unsupported file type.');
		}

		const assetsDir = join(rootDir, 'src/lib/assets');

		const uniqueFileName = `event-default-picture.png`;
		const filePath = path.resolve(assetsDir, uniqueFileName);

		try {
			const pngBuffer = await sharp(buffer).png().toBuffer();

			await writeFile(filePath, pngBuffer);
		} catch (err) {
			throw error(500, `Failed to process or save file: ${err}`);
		}

		throw redirect(303, `${adminPrefix()}/schedule`);
	}
};
