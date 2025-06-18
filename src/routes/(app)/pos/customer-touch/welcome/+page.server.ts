import { collections } from '$lib/server/database';
import { userIdentifier, userQuery } from '$lib/server/user';
import { Cart } from '$lib/types/Cart.js';
import { redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const load = async ({ locals }) => {
	await collections.carts.deleteMany(userQuery(userIdentifier(locals)));
};

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const result = z.object({ target: z.string() }).parse({
			target: formData.get('target')
		});
		await collections.carts.insertOne({
			_id: new ObjectId(),
			items: [],
			target: result.target as Cart['target'],
			origin: 'touch-selfcare',
			updatedAt: new Date(),
			createdAt: new Date(),
			user: userIdentifier(locals)
		});
		throw redirect(303, '/pos/customer-touch/start');
	}
};
