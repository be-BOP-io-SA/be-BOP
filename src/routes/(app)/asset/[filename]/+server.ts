import { rootDir } from '$lib/server/root-dir';
import fs from 'fs';
import { join } from 'path';

export async function GET({ params }) {
	const assetDir = join(rootDir, 'src/lib/assets');
	const filePath = join(assetDir, params.filename);

	try {
		const fileContent = fs.readFileSync(filePath);

		return new Response(fileContent, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch (err) {
		return new Response('Error' + err);
	}
}
