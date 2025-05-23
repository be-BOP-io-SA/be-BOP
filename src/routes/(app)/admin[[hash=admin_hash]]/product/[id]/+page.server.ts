import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';
import { deletePicture } from '$lib/server/picture';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { productBaseSchema } from '../product-schema';
import { amountOfProductReserved, amountOfProductSold } from '$lib/server/product';
import type { Tag } from '$lib/types/Tag';
import { adminPrefix } from '$lib/server/admin';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';
import { defaultSchedule, productToScheduleId } from '$lib/types/Schedule';
import type { Picture } from '$lib/types/Picture';

export const load = async ({ params }) => {
	const pictures = await collections.pictures
		.find({ productId: params.id })
		.sort({ order: 1, createdAt: 1 })
		.toArray();
	const digitalFiles = await collections.digitalFiles
		.find({ productId: params.id })
		.sort({ createdAt: 1 })
		.toArray();
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const [reserved, sold, scanned] = await Promise.all([
		amountOfProductReserved(params.id),
		amountOfProductSold(params.id),
		collections.tickets.countDocuments({ productId: params.id, scanned: { $exists: true } })
	]);

	return {
		pictures,
		digitalFiles,
		tags,
		reserved,
		sold,
		scanned
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		json.paymentMethods = formData.getAll('paymentMethods')?.map(String);

		const product = await collections.products.findOne({ _id: params.id });

		if (!product) {
			throw error(404, 'Product not found');
		}

		const { priceCurrency } = z
			.object({
				priceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
			})
			.parse({
				priceCurrency: formData.get('priceCurrency')
			});

		const parsed = z
			.object({
				tagIds: z.string().array(),
				...productBaseSchema(),
				changedDate: z.boolean({ coerce: true }).default(false)
			})
			.parse({
				...json,
				availableDate: formData.get('availableDate') || undefined,
				tagIds: JSON.parse(String(formData.get('tagIds'))).map((x: { value: string }) => x.value)
			});

		if (product.type !== 'resource') {
			delete parsed.availableDate;
			parsed.preorder = false;
		}

		if (!parsed.changedDate) {
			delete parsed.availableDate;
		}

		const availableDate = product.availableDate || parsed.availableDate;
		if (!availableDate || availableDate < new Date()) {
			parsed.preorder = false;
		}

		if (product.type === 'donation') {
			parsed.shipping = false;
		}

		const priceAmount = parsed.free ? 0 : parsePriceAmount(parsed.priceAmount, priceCurrency);

		if (!parsed.free && !parsed.payWhatYouWant && parsed.priceAmount === '0') {
			parsed.free = true;
		}
		const variationsParsedPrice = parsed.variations.map((variation) => ({
			...variation,
			price: Math.max(parsePriceAmount(variation.price, parsed.priceCurrency), 0)
		}));
		const amountInCarts = await amountOfProductReserved(params.id);
		const cleanedVariationLabels: {
			names: Record<string, string>;
			values: Record<string, Record<string, string>>;
		} = {
			names: {},
			values: {}
		};
		for (const key in parsed.variationLabels?.names) {
			const nameValue = parsed.variationLabels.names[key];

			if (nameValue.trim() !== '') {
				cleanedVariationLabels.names[key] = nameValue;
			}
		}
		for (const key in parsed.variationLabels?.values) {
			const valueEntries = parsed.variationLabels.values[key];
			cleanedVariationLabels.values[key] = {};
			for (const valueKey in valueEntries) {
				if (valueEntries[valueKey].trim() !== '') {
					cleanedVariationLabels.values[key][valueKey] = valueEntries[valueKey];
				}
			}
			if (Object.keys(cleanedVariationLabels.values[key]).length === 0) {
				delete cleanedVariationLabels.values[key];
			}
		}
		const hasVariations =
			parsed.standalone && Object.entries(cleanedVariationLabels?.names || []).length !== 0;
		try {
			const res = await collections.products.updateOne(
				{ _id: params.id },
				{
					$set: {
						name: parsed.name,
						isTicket: parsed.isTicket,
						alias: parsed.alias ? [params.id, parsed.alias] : [params.id],
						description: parsed.description,
						shortDescription: parsed.shortDescription,
						price: {
							amount: priceAmount,
							currency: priceCurrency
						},
						...(parsed.availableDate && { availableDate: parsed.availableDate }),
						shipping: parsed.shipping,
						displayShortDescription: parsed.displayShortDescription,
						preorder: parsed.preorder,
						...(parsed.customPreorderText && { customPreorderText: parsed.customPreorderText }),
						payWhatYouWant: parsed.payWhatYouWant,
						...(parsed.payWhatYouWant && {
							recommendedPWYWAmount: parsePriceAmount(
								parsed.recommendedPWYWAmount,
								parsed.priceCurrency
							)
						}),
						...(parsed.hasMaximumPrice &&
							parsed.maxPriceAmount && {
								maximumPrice: {
									amount: parsePriceAmount(parsed.maxPriceAmount, parsed.priceCurrency),
									currency: parsed.priceCurrency
								}
							}),
						hideDiscountExpiration: parsed.hideDiscountExpiration,
						standalone: parsed.payWhatYouWant || parsed.standalone,
						free: parsed.free,
						...(parsed.deliveryFees && { deliveryFees: parsed.deliveryFees }),
						applyDeliveryFeesOnlyOnce: parsed.applyDeliveryFeesOnlyOnce,
						requireSpecificDeliveryFee: parsed.requireSpecificDeliveryFee,
						...(parsed.maxQuantityPerOrder && { maxQuantityPerOrder: parsed.maxQuantityPerOrder }),
						...(parsed.stock !== undefined && {
							stock: {
								total: parsed.stock,
								reserved: amountInCarts,
								available: parsed.stock - amountInCarts
							}
						}),
						...(parsed.depositPercentage !== undefined && {
							deposit: {
								percentage: parsed.depositPercentage,
								enforce: parsed.enforceDeposit
							}
						}),
						actionSettings: {
							eShop: {
								visible: parsed.eshopVisible,
								canBeAddedToBasket: parsed.eshopBasket
							},
							retail: {
								visible: parsed.retailVisible,
								canBeAddedToBasket: parsed.retailBasket
							},
							googleShopping: {
								visible: parsed.googleShoppingVisible
							},
							nostr: {
								visible: parsed.nostrVisible,
								canBeAddedToBasket: parsed.nostrBasket
							}
						},
						tagIds: parsed.tagIds,
						cta: parsed.cta?.filter((ctaLink) => ctaLink.label && ctaLink.href),
						externalResources: parsed.externalResources?.filter(
							(externalResourceLink) => externalResourceLink.label && externalResourceLink.href
						),
						contentBefore: parsed.contentBefore,
						contentAfter: parsed.contentAfter,
						...(parsed.bookingSpec && { bookingSpec: parsed.bookingSpec }),
						mobile: {
							hideContentBefore: parsed.hideContentBefore,
							hideContentAfter: parsed.hideContentAfter
						},
						updatedAt: new Date(),
						...(parsed.vatProfileId && { vatProfileId: new ObjectId(parsed.vatProfileId) }),
						...(parsed.restrictPaymentMethods && {
							paymentMethods: parsed.paymentMethods ?? []
						}),
						hasVariations,
						...(hasVariations && {
							variations: variationsParsedPrice.filter(
								(variation) => variation.name && variation.value
							),
							variationLabels: cleanedVariationLabels
						}),
						hasSellDisclaimer: parsed.hasSellDisclaimer,
						...(parsed.hasSellDisclaimer &&
							parsed.sellDisclaimerTitle &&
							parsed.sellDisclaimerReason && {
								sellDisclaimer: {
									title: parsed.sellDisclaimerTitle,
									reason: parsed.sellDisclaimerReason
								}
							}),
						hideFromSEO: parsed.hideFromSEO
					},
					$unset: {
						...(!parsed.customPreorderText && { customPreorderText: '' }),
						...(!parsed.availableDate && { availableDate: '' }),
						...(!parsed.deliveryFees && { deliveryFees: '' }),
						...(parsed.stock === undefined && { stock: '' }),
						...(!parsed.maxQuantityPerOrder && { maxQuantityPerOrder: '' }),
						...(!parsed.depositPercentage && { deposit: '' }),
						...(!parsed.vatProfileId && { vatProfileId: '' }),
						...(!parsed.restrictPaymentMethods && { paymentMethods: '' }),
						...(!hasVariations && { variations: '', variationLabels: '' }),
						...(!parsed.hasSellDisclaimer && { sellDisclaimer: '' }),
						...(!parsed.payWhatYouWant && { recommendedPWYWAmount: '' }),
						...(!parsed.bookingSpec && { bookingSpec: '' }),
						...(!parsed.hasMaximumPrice && { maximumPrice: '' })
					}
				}
			);

			if (
				parsed.bookingSpec &&
				!(await collections.schedules.countDocuments({ _id: productToScheduleId(params.id) }))
			) {
				await collections.schedules.insertOne({
					...defaultSchedule,
					_id: productToScheduleId(params.id),
					name: parsed.name,
					events: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					productId: params.id
				});
			}

			if (!res.matchedCount) {
				throw error(404, 'Product not found');
			}
		} catch (err) {
			if (isUniqueConstraintError(err)) {
				throw error(400, 'A product with the same alias already exists');
			} else {
				throw err;
			}
		}

		return {};
	},

	updateOrder: async ({ request }) => {
		const formData = await request.formData();
		const pictureIds = z
			.object({
				pictureId: z.string().array().min(1)
			})
			.parse({
				pictureId: formData.getAll('pictureId')
			}).pictureId;

		const bulkOps: AnyBulkWriteOperation<Picture>[] = pictureIds.map((id, index) => ({
			updateOne: {
				filter: { _id: id },
				update: { $set: { order: index } }
			}
		}));

		await collections.pictures.bulkWrite(bulkOps, { ordered: false });
	},

	delete: async ({ params }) => {
		for await (const picture of collections.pictures.find({ productId: params.id })) {
			await deletePicture(picture._id);
		}
		await collections.products.deleteOne({ _id: params.id });

		throw redirect(303, `${adminPrefix()}/product`);
	}
};
