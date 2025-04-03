import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
	const { lang } = params;
	const docsPath = path.resolve('docs', lang);

	try {
		const files = fs.readdirSync(docsPath).filter((file) => file.endsWith('.md'));
		return new Response(JSON.stringify(files), { status: 200 });
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Folder not found' }), { status: 404 });
	}
}
