import { adminPrefix } from '$lib/server/admin';
import { rootDir } from '$lib/server/root-dir';
import { redirect } from '@sveltejs/kit';
import { error } from 'console';
import { writeFile } from 'fs/promises';
import path from 'path';
import { join } from 'path';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || file.type !== 'image/svg+xml') {
			throw error(402, 'Invalid file format');
		}
		const buffer = Buffer.from(await file.arrayBuffer());
		const assetsDir = join(rootDir, 'src/lib/assets');

		const filePath = path.resolve(assetsDir, 'event-default-picture.svg');
		await writeFile(filePath, buffer);

		throw redirect(303, `${adminPrefix()}/schedule`);
	}
};
