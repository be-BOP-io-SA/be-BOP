import { adminPrefix } from '$lib/server/admin';
import { collections, withTransaction } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError.js';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { exportToICS } from '$lib/types/Schedule.js';
import { error } from '@sveltejs/kit';
import { addMinutes, format } from 'date-fns';
import { z } from 'zod';

export const actions = {
	creatTicket: async function ({ request, params }) {
		const schedule = await collections.schedules.findOne({ _id: params.id });
		if (!schedule) {
			throw error(404, 'Schedule not found');
		}
		const eventSchedule = schedule.events.find((e) => e.slug === params.slug);
		if (!eventSchedule) {
			throw error(404, 'Event Schedule not found');
		}
		const pictures = await collections.pictures
			.find({
				'schedule._id': params.id,
				'schedule.eventSlug': params.slug
			})
			.sort({ createdAt: 1 })
			.toArray();
		if (!pictures.length) {
			throw error(404, 'Event Should have picture to create product');
		}
		const formData = await request.formData();
		const parsed = z
			.object({
				useTitleDateAsShortDesc: z.boolean({ coerce: true }).default(false),
				displayShortDescription: z.boolean({ coerce: true }).default(false),
				exportEventToCalendar: z.boolean({ coerce: true }).default(false),
				locationUrlCta: z.boolean({ coerce: true }).default(false),
				overwriteEventUrl: z.boolean({ coerce: true }).default(false),
				CTAForMoreInformation: z.boolean({ coerce: true }).default(false),
				priceAmount: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				priceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]).optional(),
				stock: z.number({ coerce: true }).int().min(0).optional()
			})
			.parse(Object.fromEntries(formData));
		const priceAmount = !parsed.priceAmount
			? 0
			: parsePriceAmount(parsed.priceAmount, parsed.priceCurrency || runtimeConfig.mainCurrency);

		const shortDescription = parsed.useTitleDateAsShortDesc
			? `${eventSchedule.title} – ${format(new Date(eventSchedule.beginsAt), 'PPP')}`
			: eventSchedule.shortDescription || '';

		const ctaLink: { label: string; href: string; fallback?: boolean; downloadLink?: string }[] =
			[];
		const ctaLinkFr: { label: string; href: string; fallback?: boolean; downloadLink?: string }[] =
			[];
		if (parsed.exportEventToCalendar) {
			ctaLink.push({
				label: 'Export to calendar',
				href: exportToICS(eventSchedule, schedule.pastEventDelay),
				fallback: false,
				downloadLink: `${eventSchedule.title}.ics`
			});
			ctaLinkFr.push({
				label: 'Exporter',
				href: exportToICS(eventSchedule, schedule.pastEventDelay),
				fallback: false,
				downloadLink: `${eventSchedule.title}.ics`
			});
		}
		if (parsed.locationUrlCta && eventSchedule.location?.link) {
			ctaLink.push({
				label: 'Location',
				href: eventSchedule.location.link,
				fallback: false
			});
			ctaLinkFr.push({
				label: 'Place',
				href: eventSchedule.location.link,
				fallback: false
			});
		}
		if (parsed.CTAForMoreInformation && eventSchedule.url) {
			ctaLink.push({
				label: 'More Information',
				href: eventSchedule.url,
				fallback: false
			});
			ctaLink.push({
				label: "Plus d'info",
				href: eventSchedule.url,
				fallback: false
			});
		}

		await withTransaction(async (session) => {
			await collections.pictures.updateOne(
				{ _id: pictures[0]._id },
				{
					$set: {
						updatedAt: new Date(),
						productId: eventSchedule.slug
					}
				}
			);

			try {
				await collections.products.insertOne(
					{
						_id: eventSchedule.slug,
						alias: [eventSchedule?.slug],
						createdAt: new Date(),
						updatedAt: new Date(),
						description: eventSchedule.description || '',
						shortDescription: shortDescription,
						name: eventSchedule?.title,
						isTicket: true,
						price: {
							currency: parsed.priceCurrency || runtimeConfig.mainCurrency,
							amount: priceAmount
						},
						type: 'resource',
						...(parsed.stock !== undefined && {
							stock: { total: parsed.stock, available: parsed.stock, reserved: 0 }
						}),
						availableDate: undefined,
						preorder: false,
						shipping: false,
						free: !priceAmount,
						displayShortDescription: parsed.displayShortDescription,
						standalone: false,
						payWhatYouWant: false,
						hideDiscountExpiration: false,
						cta: ctaLink.filter((ctaLink) => ctaLink.label && ctaLink.href),
						actionSettings: {
							eShop: {
								visible: true,
								canBeAddedToBasket: true
							},
							retail: {
								visible: true,
								canBeAddedToBasket: true
							},
							googleShopping: {
								visible: true
							},
							nostr: {
								visible: true,
								canBeAddedToBasket: true
							}
						},
						event: {
							beginsAt: eventSchedule.beginsAt,
							endsAt:
								eventSchedule.endsAt || addMinutes(eventSchedule.beginsAt, schedule.pastEventDelay)
						},
						translations: {
							en: {
								cta: ctaLink
							},
							fr: {
								cta: ctaLinkFr
							}
						}
					},
					{ session }
				);
			} catch (err) {
				if (isUniqueConstraintError(err)) {
					throw error(400, 'A product with the same alias already exists');
				} else {
					throw err;
				}
			}
			await collections.schedules.updateOne(
				{ _id: params.id, 'events.slug': params.slug },
				{
					$set: {
						'events.$.productId': params.slug,
						...(parsed.overwriteEventUrl && {
							'events.$.url': `/product/${params.slug}`
						})
					}
				}
			);
		});
		const redirectUrl = `${adminPrefix()}/product/${params.slug}`;
		return { redirectUrl };
	}
};
