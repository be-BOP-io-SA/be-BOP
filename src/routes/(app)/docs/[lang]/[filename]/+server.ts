import { error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
	const { lang, filename } = params;
	const filePath = path.resolve('docs', lang, filename);

	if (!fs.existsSync(filePath)) {
		throw error(404, 'File not found');
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	return new Response(content, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
