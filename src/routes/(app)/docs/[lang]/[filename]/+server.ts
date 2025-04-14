import { rootDir } from '$lib/server/root-dir';
import { error } from '@sveltejs/kit';
import fs from 'fs';
import { join } from 'path';
import { z } from 'zod';

export async function GET({ params }) {
	const docsDir = join(rootDir, 'docs');

	const validFolderNameRegex = /^[a-z]{2}(-[a-z]{2})?$/i;
	const availableLangs = fs
		.readdirSync(docsDir)
		.filter(
			(folder) =>
				validFolderNameRegex.test(folder) && fs.statSync(join(docsDir, folder)).isDirectory()
		);

	const langSchema = z.enum(availableLangs as [string, ...string[]]);
	let lang: string;

	try {
		lang = langSchema.parse(params.lang);
	} catch {
		throw error(400, 'Invalid language');
	}

	const folderPath = join(docsDir, lang);

	const availableFiles = fs
		.readdirSync(folderPath)
		.filter((file) => file.endsWith('.md') && fs.statSync(join(folderPath, file)).isFile());

	const filenameSchema = z.enum(availableFiles as [string, ...string[]]);
	let filename: string;

	try {
		filename = filenameSchema.parse(params.filename);
	} catch {
		throw error(404, 'File not found');
	}

	const filePath = join(folderPath, filename);

	const content = fs.readFileSync(filePath, 'utf-8');

	return new Response(content, {
		status: 200,
		headers: { 'Content-Type': 'text/plain' }
	});
}
