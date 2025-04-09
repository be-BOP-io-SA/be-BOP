import { SMTP_USER } from '$env/static/private';
import { collections } from '$lib/server/database';
import { queueEmail } from '$lib/server/email';
import { zodNpub } from '$lib/server/nostr';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';
import { format } from 'date-fns';
import { ObjectId } from 'mongodb';
import { Kind } from 'nostr-tools';
import { z } from 'zod';

export const load = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}
	const pictures = await collections.pictures
		.find({ 'schedule._id': params.id })
		.sort({ createdAt: 1 })
		.toArray();
	return {
		schedule,
		pictures
	};
};

export const actions = {
	notify: async function ({ request, params, locals }) {
		const schedule = await collections.schedules.findOne({ _id: params.id });
		if (!schedule) {
			throw error(404, 'Schedule not found');
		}
		const eventSchedule = schedule.events.find((e) => e.slug === params.slug);
		if (!eventSchedule) {
			throw error(404, 'Event not found');
		}

		const data = await request.formData();

		const { address } = z
			.object({
				address: z.union([z.string().email(), zodNpub()])
			})
			.parse({
				address: data.get('address')
			});
		rateLimit(locals.clientIp, 'email', 5, { minutes: 5 });

		await queueEmail(
			runtimeConfig.sellerIdentity?.contact.email || SMTP_USER,
			'schedule.rsvp.admin',
			{
				brandName: runtimeConfig.brandName,
				eventName: eventSchedule.title,
				participantContact: address
			}
		);
		if (address.includes('@')) {
			await queueEmail(address || SMTP_USER, 'schedule.rsvp.user', {
				brandName: runtimeConfig.brandName,
				eventName: eventSchedule.title,
				eventDate: format(eventSchedule.beginsAt, 'EEEE dd MMM yyyy HH:mm'),
				eventShortDescription: eventSchedule.shortDescription,
				eventDescription: eventSchedule.description,
				eventLocationName: eventSchedule.location?.name,
				eventLocationLink: eventSchedule.location?.link,
				eventCancellationLink: eventSchedule.rsvp.target
			});
		}
		if (!address.includes('@')) {
			const content = `This message was sent to you because you confirmed your participation to this event ${
				eventSchedule.title
			} by ${runtimeConfig.brandName}.
				${eventSchedule.title} - ${format(eventSchedule.beginsAt, 'yyyy-MM-dd')}
				${eventSchedule.shortDescription}
				${eventSchedule.description}
				${eventSchedule.location?.name}
				${eventSchedule.location?.link}`;

			await collections.nostrNotifications.insertOne({
				_id: new ObjectId(),
				createdAt: new Date(),
				kind: Kind.EncryptedDirectMessage,
				updatedAt: new Date(),
				content,
				dest: address
			});
		}
		return { success: true };
	}
};
