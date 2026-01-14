import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userIdentifier, userQuery } from '$lib/server/user';
import { Cart } from '$lib/types/Cart.js';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const load = async ({ locals }) => {
	await collections.carts.deleteMany(userQuery(userIdentifier(locals)));

	const cmsIntro = await collections.cmsPages.findOne(
		{ _id: 'touch-intro-1' },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] }
			}
		}
	);

	return {
		cmsIntroContent: cmsIntro?.content ?? null
	};
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
		const isEnabled = runtimeConfig.enableCustomerTouchInterface;
		const ctiConfig = runtimeConfig.customerTouchInterface;
		if (!isEnabled || !ctiConfig) {
			throw error(400, 'Customer Touch Interface is not enabled');
		}
		if (ctiConfig.enableCustomerLogin) {
			throw redirect(302, '/pos/customer-touch/start');
		} else {
			throw redirect(302, '/pos/customer-touch/list/home');
		}
	}
};
