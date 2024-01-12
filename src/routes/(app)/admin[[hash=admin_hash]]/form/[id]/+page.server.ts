import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { contactFormTranslatableSchema } from './contact-form-schema';

export async function load({ params }) {
	const contactForm = await collections.contactForms.findOne({
		_id: params.id
	});

	if (!contactForm) {
		throw error(404, 'Page not found');
	}

	return {
		contactForm
	};
}
export const actions = {
	update: async function ({ request, params }) {
		const contactForm = await collections.contactForms.findOne({
			_id: params.id
		});

		if (!contactForm) {
			throw error(404, 'Contact form not found');
		}

		const data = await request.formData();

		const parsed = z
			.object({
				title: z.string().min(1).max(MAX_NAME_LIMIT),
				content: z.string().max(MAX_CONTENT_LIMIT),
				target: z.string().max(100),
				subject: z.string().max(100)
			})
			.parse(Object.fromEntries(data));
		await collections.contactForms.updateOne(
			{
				_id: contactForm._id
			},
			{
				$set: {
					title: parsed.title,
					target: parsed.target,
					content: parsed.content,
					subject: parsed.subject,
					updatedAt: new Date()
				}
			}
		);
	},

	delete: async function ({ params }) {
		await collections.contactForms.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/form`);
	}
};
