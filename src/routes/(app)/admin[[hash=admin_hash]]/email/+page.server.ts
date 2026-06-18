import { collections } from '$lib/server/database';
import type { EmailNotification } from '$lib/types/EmailNotification';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		emails: collections.emailNotifications
			.find({})
			.project<Pick<EmailNotification, 'subject' | 'dest' | 'error' | 'processedAt'>>({
				subject: 1,
				dest: 1,
				error: 1,
				processedAt: 1,
				_id: 0
			})
			.sort({ _id: -1 })
			.limit(100)
			.toArray()
	};
};

export const actions: Actions = {
	default: async function ({ request }) {
		const { to, subject, body } = z
			.object({
				to: z.string().email(),
				subject: z.string(),
				body: z.string()
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.emailNotifications.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			updatedAt: new Date(),
			subject,
			htmlContent: body,
			dest: to
		});

		return {
			success: true
		};
	}
};
