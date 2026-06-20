import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { adminLinks } from '../adminLinks';

const validHrefs = new Set(adminLinks.flatMap((s) => s.links.map((l) => l.href)));

export const POST = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Not logged in');
	}

	const { href } = z
		.object({
			href: z.string().refine((v) => validHrefs.has(v), 'Unknown admin entry')
		})
		.parse(JSON.parse(await request.text()));

	const user = await collections.users.findOne(
		{ _id: locals.user._id },
		{ projection: { 'userSettings.backOfficeBookmarks': 1 } }
	);
	if (!user) {
		throw error(404, 'User not found');
	}

	const current = user.userSettings?.backOfficeBookmarks ?? [];
	const next = current.includes(href) ? current.filter((h) => h !== href) : [...current, href];

	await collections.users.updateOne(
		{ _id: locals.user._id },
		{ $set: { 'userSettings.backOfficeBookmarks': next, updatedAt: new Date() } }
	);

	return new Response(JSON.stringify({ bookmarks: next }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
