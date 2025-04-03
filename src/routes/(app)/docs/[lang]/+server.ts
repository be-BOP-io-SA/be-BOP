import fs from 'fs';
import path from 'path';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	const { lang } = params;
	const docsPath = path.resolve('docs', lang);

	try {
		const files = fs.readdirSync(docsPath).filter((file) => file.endsWith('.md'));
		return new Response(JSON.stringify(files), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		throw error(404, `Error while fetching file ${err}`);
	}
}
