import { rootDir } from '$lib/server/root-dir';
import { createHash } from 'crypto';
import fs from 'fs';
import { join } from 'path';

export async function GET({ params, request }) {
	const assetDir = join(rootDir, 'src/lib/assets');
	const filePath = join(assetDir, params.filename);

	try {
		const fileContent = fs.readFileSync(filePath);
		const hash = createHash('sha1').update(fileContent).digest('hex');

		const ifNoneMatch = request.headers.get('If-None-Match');

		if (ifNoneMatch === hash) {
			return new Response(null, {
				status: 304,
				headers: {
					'Cache-Control': 'max-age=0; must-revalidate',
					ETag: `"${hash}"`
				}
			});
		}

		return new Response(fileContent, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'max-age=0; must-revalidate',
				ETag: `"${hash}"`
			}
		});
	} catch (err) {
		console.error('Error serving asset:', err);
		return new Response('Asset not found or server error', { status: 404 });
	}
}
