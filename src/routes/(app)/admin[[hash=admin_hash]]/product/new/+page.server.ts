import { collections, withTransaction } from '$lib/server/database';
import { generatePicture } from '$lib/server/picture';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { ORIGIN, S3_BUCKET } from '$env/static/private';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Product } from '$lib/types/Product';
import { Kind } from 'nostr-tools';
import { parsePriceAmount } from '$lib/types/Currency';
import { s3ProductPrefix, s3client } from '$lib/server/s3';
import type { JsonObject } from 'type-fest';
import { set } from 'lodash-es';
import { productBaseSchema } from '../product-schema';
import { generateId } from '$lib/utils/generateId';
import { CopyObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import type { Tag } from '$lib/types/Tag';
import { adminPrefix } from '$lib/server/admin';
import { pojo } from '$lib/server/pojo';
import { zodSlug } from '$lib/server/zod';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';

export const load = async ({ url }) => {
	const productId = url.searchParams.get('duplicate_from');

	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	if (productId) {
		const product = await collections.products.findOne({ _id: productId });

		if (product) {
			const pictures = await collections.pictures
				.find({ productId: productId })
				.sort({ createdAt: 1 })
				.toArray();

			const digitalFiles = await collections.digitalFiles
				.find({ productId: productId })
				.sort({ createdAt: 1 })
				.toArray();

			return {
				product: pojo(product),
				productId,
				pictures,
				digitalFiles,
				tags,
				currency: runtimeConfig.priceReferenceCurrency
			};
		}
	}
	return {
		tags
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		json.paymentMethods = formData.getAll('paymentMethods')?.map(String);

		const parsed = z
			.object({
				slug: zodSlug(),
				pictureId: z.string().trim().min(1).max(500),
				type: z.enum(['resource', 'donation', 'subscription']),
				tagIds: z.string().array(),
				...productBaseSchema()
			})
			.parse({
				...json,
				availableDate: formData.get('availableDate') || undefined,
				tagIds: JSON.parse(String(formData.get('tagIds'))).map((x: { value: string }) => x.value)
			});

		if (await collections.products.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Product with same slug already exists');
		}

		const priceAmount = parsed.free
			? 0
			: parsePriceAmount(parsed.priceAmount, parsed.priceCurrency);

		if (parsed.type !== 'resource') {
			delete parsed.availableDate;
		}

		if (!parsed.availableDate) {
			delete parsed.availableDate;
			parsed.preorder = false;
		}

		if (parsed.type === 'donation') {
			parsed.shipping = false;
		}
		const variationsParsedPrice = parsed.variations.map((variation) => ({
			...variation,
			price: Math.max(parsePriceAmount(variation.price, parsed.priceCurrency), 0)
		}));
		if (!parsed.free && !parsed.payWhatYouWant && parsed.priceAmount === '0') {
			parsed.free = true;
		}
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

		await generatePicture(parsed.pictureId, {
			productId: parsed.slug,
			cb: async (session) => {
				try {
					await collections.products.insertOne(
						{
							_id: parsed.slug,
							alias: parsed.alias ? [parsed.slug, parsed.alias] : [parsed.slug],
							createdAt: new Date(),
							updatedAt: new Date(),
							description: parsed.description.replaceAll('\r', ''),
							shortDescription: parsed.shortDescription.replaceAll('\r', ''),
							name: parsed.name,
							isTicket: parsed.isTicket,
							price: {
								currency: parsed.priceCurrency,
								amount: priceAmount
							},
							type: parsed.type,
							availableDate: parsed.availableDate || undefined,
							preorder: parsed.preorder,
							...(parsed.customPreorderText && { customPreorderText: parsed.customPreorderText }),
							shipping: parsed.shipping,
							payWhatYouWant: parsed.payWhatYouWant,
							...(parsed.hasMaximumPrice &&
								parsed.maxPriceAmount && {
									maximumPrice: {
										amount: parsePriceAmount(parsed.maxPriceAmount, parsed.priceCurrency),
										currency: parsed.priceCurrency
									}
								}),
							standalone: parsed.payWhatYouWant || parsed.standalone,
							free: parsed.free,
							displayShortDescription: parsed.displayShortDescription,
							...(parsed.deliveryFees && { deliveryFees: parsed.deliveryFees }),
							applyDeliveryFeesOnlyOnce: parsed.applyDeliveryFeesOnlyOnce,
							requireSpecificDeliveryFee: parsed.requireSpecificDeliveryFee,
							...(parsed.stock !== undefined && {
								stock: { total: parsed.stock, available: parsed.stock, reserved: 0 }
							}),
							...(parsed.depositPercentage !== undefined && {
								deposit: {
									percentage: parsed.depositPercentage,
									enforce: parsed.enforceDeposit
								}
							}),
							...(parsed.maxQuantityPerOrder && {
								maxQuantityPerOrder: parsed.maxQuantityPerOrder
							}),
							...(parsed.restrictPaymentMethods && {
								paymentMethods: parsed.paymentMethods ?? []
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
							...(parsed.standalone && { hasVariations: parsed.hasVariations }),
							...(parsed.standalone &&
								parsed.hasVariations && {
									variations: variationsParsedPrice.filter(
										(variation) => variation.name && variation.value
									)
								}),
							...(parsed.standalone &&
								parsed.hasVariations &&
								parsed.variationLabels && {
									variationLabels: cleanedVariationLabels
								}),
							...(parsed.vatProfileId && { vatProfileId: new ObjectId(parsed.vatProfileId) }),
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
						{ session }
					);
				} catch (err) {
					if (isUniqueConstraintError(err)) {
						throw error(400, 'A product with the same alias already exists');
					} else {
						throw err;
					}
				}
			}
		});

		onProductCreated({ _id: parsed.slug, name: parsed.name });

		throw redirect(303, `${adminPrefix()}/product/${parsed.slug}`);
	},

	duplicate: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		json.paymentMethods = formData.getAll('paymentMethods')?.map(String);

		const { duplicateFromId } = z
			.object({ duplicateFromId: z.string() })
			.parse(Object.fromEntries(formData));

		const product = duplicateFromId
			? await collections.products.findOne({ _id: duplicateFromId })
			: undefined;

		if (!product) {
			throw error(404, 'Duplicated product not found');
		}

		const parsed = z
			.object({
				slug: zodSlug(),
				...productBaseSchema()
			})
			.parse({
				...json,
				availableDate: formData.get('availableDate') || undefined
			});

		if (await collections.products.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Product with same slug already exists');
		}

		if (!parsed.availableDate) {
			parsed.preorder = false;
		}

		if (product.type !== 'resource') {
			delete parsed.availableDate;
			parsed.preorder = false;
		}

		if (product.type === 'donation') {
			parsed.shipping = false;
		}

		const insertedS3Keys: string[] = [];
		const variationsParsedPrice = parsed.variations.map((variation) => ({
			...variation,
			price: Math.max(parsePriceAmount(variation.price, parsed.priceCurrency), 0)
		}));
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
		await withTransaction(async (session) => {
			await collections.products.insertOne(
				{
					_id: parsed.slug,
					alias: parsed.alias ? [parsed.slug, parsed.alias] : [parsed.slug],
					createdAt: new Date(),
					updatedAt: new Date(),
					description: parsed.description.replaceAll('\r', ''),
					shortDescription: parsed.shortDescription.replaceAll('\r', ''),
					name: parsed.name,
					isTicket: parsed.isTicket,
					price: {
						currency: parsed.priceCurrency,
						amount: parseFloat(parsed.priceAmount)
					},
					type: product.type,
					availableDate: parsed.availableDate || undefined,
					preorder: parsed.preorder,
					shipping: parsed.shipping,
					payWhatYouWant: parsed.payWhatYouWant,
					...(parsed.hasMaximumPrice &&
						parsed.maxPriceAmount && {
							maximumPrice: {
								amount: parsePriceAmount(parsed.maxPriceAmount, parsed.priceCurrency),
								currency: parsed.priceCurrency
							}
						}),
					standalone: parsed.standalone,
					free: parsed.free,
					...(parsed.stock !== undefined && {
						stock: { total: parsed.stock, available: parsed.stock, reserved: 0 }
					}),
					...(parsed.depositPercentage !== undefined && {
						deposit: {
							percentage: parsed.depositPercentage,
							enforce: parsed.enforceDeposit
						}
					}),
					...(parsed.maxQuantityPerOrder && {
						maxQuantityPerOrder: parsed.maxQuantityPerOrder
					}),
					displayShortDescription: parsed.displayShortDescription,
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
					...(parsed.restrictPaymentMethods && {
						paymentMethods: parsed.paymentMethods ?? []
					}),
					tagIds: product.tagIds,
					cta: product.cta,
					externalResources: product.externalResources,
					...(parsed.standalone && { hasVariations: parsed.hasVariations }),
					...(parsed.standalone &&
						parsed.hasVariations && {
							variations: variationsParsedPrice.filter(
								(variation) => variation.name && variation.value
							)
						}),
					...(parsed.standalone &&
						parsed.hasVariations &&
						parsed.variationLabels && {
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
					...(parsed.vatProfileId && { vatProfileId: new ObjectId(parsed.vatProfileId) }),
					hideFromSEO: parsed.hideFromSEO
				},
				{ session }
			);

			const picturesToDuplicate = await collections.pictures
				.find({ productId: duplicateFromId })
				.sort({ createdAt: 1 })
				.toArray();

			const digitalFilesToDuplicate = await collections.digitalFiles
				.find({ productId: duplicateFromId })
				.sort({ createdAt: 1 })
				.toArray();

			const oldS3Prefix = s3ProductPrefix(duplicateFromId);
			const newS3Prefix = s3ProductPrefix(parsed.slug);

			for (const picture of picturesToDuplicate) {
				const pictureToInsert = {
					_id: generateId(picture._id.split('-').slice(0, -1).join('-'), true),
					name: picture.name,
					storage: {
						original: {
							...picture.storage.original,
							key: picture.storage.original.key.replace(oldS3Prefix, newS3Prefix)
						},
						formats: picture.storage.formats.map((format) => ({
							...format,
							key: format.key.replace(oldS3Prefix, newS3Prefix)
						}))
					},
					productId: parsed.slug,
					createdAt: new Date(),
					updatedAt: new Date()
				};

				insertedS3Keys.push(pictureToInsert.storage.original.key);
				await s3client.send(
					new CopyObjectCommand({
						Bucket: S3_BUCKET,
						CopySource: `/${S3_BUCKET}/${picture.storage.original.key}`,
						Key: pictureToInsert.storage.original.key
					})
				);

				let formatIndex = 0;
				for (const format of picture.storage.formats) {
					insertedS3Keys.push(format.key);
					await s3client.send(
						new CopyObjectCommand({
							Bucket: S3_BUCKET,
							CopySource: `/${S3_BUCKET}/${format.key}`,
							Key: pictureToInsert.storage.formats[formatIndex++].key
						})
					);
				}

				await collections.pictures.insertOne(pictureToInsert, { session });
			}

			for (const file of digitalFilesToDuplicate) {
				const digitalFileToInsert = {
					_id: generateId(file._id.split('-').slice(0, -1).join('-'), true),
					name: file.name,
					createdAt: new Date(),
					updatedAt: new Date(),
					storage: {
						...file.storage,
						key: file.storage.key.replace(oldS3Prefix, newS3Prefix)
					},
					productId: parsed.slug
				};

				insertedS3Keys.push(digitalFileToInsert.storage.key);
				await s3client.send(
					new CopyObjectCommand({
						Bucket: S3_BUCKET,
						CopySource: `/${S3_BUCKET}/${file.storage.key}`,
						Key: digitalFileToInsert.storage.key
					})
				);

				await collections.digitalFiles.insertOne(digitalFileToInsert, { session });
			}
		}).catch((err) => {
			s3client
				.send(
					new DeleteObjectsCommand({
						Bucket: S3_BUCKET,
						Delete: {
							Objects: insertedS3Keys.map((key) => ({ Key: key }))
						}
					})
				)
				.catch(console.error);
			return err;
		});

		onProductCreated({ _id: parsed.slug, name: parsed.name });

		throw redirect(303, `${adminPrefix()}/product/${parsed.slug}`);
	}
};

// This could be a change stream on collections.product
function onProductCreated(product: Pick<Product, '_id' | 'name'>) {
	if (runtimeConfig.discovery) {
		(async function () {
			for await (const subscription of collections.bootikSubscriptions.find({
				npub: { $exists: true }
			})) {
				await collections.nostrNotifications
					.insertOne({
						_id: new ObjectId(),
						dest: subscription.npub,
						kind: Kind.EncryptedDirectMessage,
						content: `New product "${product.name}": ${ORIGIN}/product/${product._id}`,
						createdAt: new Date(),
						updatedAt: new Date()
					})
					.catch(console.error);
			}
		})().catch(console.error);
	}
}
