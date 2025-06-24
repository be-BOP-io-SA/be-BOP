import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Tag } from '$lib/types/Tag';
import { set } from '$lib/utils/set';
import { error, redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const load = async ({}) => {
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();

	return {
		tags: tags.filter((tag) => tag._id !== 'pos-favorite'),
		posTouchTag: runtimeConfig.posTouchTag,
		posPrefillTermOfUse: runtimeConfig.posPrefillTermOfUse,
		notPrefillCheckoutAddress: runtimeConfig.notPrefillCheckoutAddress,
		posDisplayOrderQrAfterPayment: runtimeConfig.posDisplayOrderQrAfterPayment,
		posQrCodeAfterPayment: runtimeConfig.posQrCodeAfterPayment
	};
};
export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const posTouchTagString = formData.get('posTouchTag');
		if (!posTouchTagString) {
			throw error(400, 'No posTouchTag provided');
		}
		const posTouchTag = JSON.parse(String(posTouchTagString));
		const result = z
			.object({
				posTouchTag: z.string().array(),
				posPrefillTermOfUse: z.boolean({ coerce: true }),
				notPrefillCheckoutAddress: z.boolean({ coerce: true }),
				posDisplayOrderQrAfterPayment: z.boolean({ coerce: true })
			})
			.parse({
				...json,
				posTouchTag
			});

		const parsedOptsForPosQrCodeAfterPayment = z
			.object({
				posQrCodeAfterPayment: z
					.object({
						timeBeforeRedirecting: z
							.string()
							.regex(/^\d+(\.\d+)?$/)
							.optional(),
						displayCustomerCta: z.boolean({ coerce: true }).optional(),
						removeBebobLogo: z.boolean({ coerce: true }).optional()
					})
					.optional()
			})
			.parse(json);
		const posQrCodeAfterPayment = {
			...parsedOptsForPosQrCodeAfterPayment.posQrCodeAfterPayment,
			timeBeforeRedirecting: Number(
				parsedOptsForPosQrCodeAfterPayment.posQrCodeAfterPayment
					? parsedOptsForPosQrCodeAfterPayment.posQrCodeAfterPayment?.timeBeforeRedirecting
					: 10
			)
		};
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posTouchTag'
			},
			{
				$set: {
					data: result.posTouchTag,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posPrefillTermOfUse'
			},
			{
				$set: {
					data: result.posPrefillTermOfUse,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		await collections.runtimeConfig.updateOne(
			{
				_id: 'notPrefillCheckoutAddress'
			},
			{
				$set: {
					data: result.notPrefillCheckoutAddress,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.notPrefillCheckoutAddress = result.notPrefillCheckoutAddress;
		runtimeConfig.posPrefillTermOfUse = result.posPrefillTermOfUse;
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posDisplayOrderQrAfterPayment'
			},
			{
				$set: {
					data: result.posDisplayOrderQrAfterPayment,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.posDisplayOrderQrAfterPayment = result.posDisplayOrderQrAfterPayment;
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posQrCodeAfterPayment'
			},
			{
				$set: {
					data: posQrCodeAfterPayment,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		throw redirect(303, `${adminPrefix()}/pos`);
	}
};
