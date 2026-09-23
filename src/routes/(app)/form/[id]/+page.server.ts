import { ORIGIN, SMTP_USER } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import { rateLimit } from '$lib/server/rateLimit';
import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { Kind } from 'nostr-tools';
import { z } from 'zod';
import { escapeHtml } from '$lib/utils/escapeHtml';

export const load = async ({ params, locals }) => {
	const contactForm = await collections.contactForms.findOne(
		{ _id: params.id },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				subject: { $ifNull: [`$translations.${locals.language}.subject`, '$subject'] },
				disclaimer: { $ifNull: [`$translations.${locals.language}.disclaimer`, '$disclaimer'] },
				target: 1,
				displayFromField: 1
			}
		}
	);

	if (!contactForm) {
		throw error(404, 'contact form not found');
	}

	return {
		contactForm,
		email: locals.email
	};
};

export const actions = {
	sendEmail: async function ({ request, locals, params }) {
		const contactForm = await collections.contactForms.findOne({ _id: params.id });
		if (!contactForm) {
			throw error(404, 'contact form not found');
		}
		rateLimit(locals.clientIp, 'email', 5, { minutes: 5 });

		const data = await request.formData();
		const parsed = z
			.object({
				content: z.string().max(MAX_CONTENT_LIMIT),
				subject: z.string().max(100),
				from: z.string().email().max(100).optional()
			})
			.parse(Object.fromEntries(data));

		// Escaped before the line breaks become markup: the sender is an anonymous visitor, and
		// this lands in the shop owner's inbox signed by the shop's own domain.
		const parsedMessageHtml = escapeHtml(parsed.content).replace(/\r\n|\r|\n/g, '<br>');
		const htmlContent = `Message envoyé par formulaire sur le site ${ORIGIN}<br> Adresse de contact : ${
			parsed.from ? escapeHtml(parsed.from) : 'non-renseigné'
		}  <br> Message envoyé :<br> ${parsedMessageHtml}`;
		const content = `Message envoyé par formulaire sur le site ${ORIGIN} Adresse de contact : ${
			parsed.from ? parsed.from : 'non-renseigné'
		}   Message envoyé : ${parsed.content}`;

		if (contactForm.target.startsWith('npub')) {
			await collections.nostrNotifications.insertOne({
				_id: new ObjectId(),
				createdAt: new Date(),
				kind: Kind.EncryptedDirectMessage,
				updatedAt: new Date(),
				content,
				dest: contactForm.target
			});
		} else {
			await collections.emailNotifications.insertOne({
				_id: new ObjectId(),
				createdAt: new Date(),
				updatedAt: new Date(),
				subject: parsed.subject,
				htmlContent: htmlContent,
				dest: contactForm.target || SMTP_USER
			});
		}

		throw redirect(303, request.headers.get('referer') || '/');
	}
};
