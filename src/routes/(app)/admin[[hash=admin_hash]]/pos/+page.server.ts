import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { ALL_PAYMENT_PROCESSORS } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Tag } from '$lib/types/Tag';
import { set } from '$lib/utils/set';
import { typedInclude } from '$lib/utils/typedIncludes';
import { error, redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { persistConfigElement } from '$lib/server/utils/persistConfig';

export const load = async ({}) => {
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const supportedTapToPayProviders = ['not-used', 'stripe'] as const;
	const tapToPayProviders: { provider: string; displayName: string; available: boolean }[] =
		supportedTapToPayProviders.map((provider) => {
			switch (provider) {
				case 'not-used':
					return { provider, displayName: 'Not used', available: true };
				case 'stripe':
					return {
						provider,
						displayName: 'Stripe',
						available: !!runtimeConfig.stripe.secretKey
					};
				default:
					provider satisfies never;
					return { provider, displayName: `Unknown: ${provider}`, available: false };
			}
		});
	return {
		tags: tags.filter((tag) => tag._id !== 'pos-favorite'),
		posTouchTag: runtimeConfig.posTouchTag,
		posTabGroups: runtimeConfig.posTabGroups,
		posPrefillTermOfUse: runtimeConfig.posPrefillTermOfUse,
		posDisplayOrderQrAfterPayment: runtimeConfig.posDisplayOrderQrAfterPayment,
		posQrCodeAfterPayment: runtimeConfig.posQrCodeAfterPayment,
		tapToPay: {
			providers: tapToPayProviders,
			currentProcessor: runtimeConfig.posTapToPay.processor,
			onActivationUrl: runtimeConfig.posTapToPay.onActivationUrl ?? ''
		}
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const posTabGroupsString = formData.get('posTabGroups');
		if (!posTabGroupsString) {
			throw error(400, 'No posTabGroups provided');
		}
		const posTabGroups = JSON.parse(String(posTabGroupsString));

		const posTouchTagString = formData.get('posTouchTag');
		if (!posTouchTagString) {
			throw error(400, 'No posTouchTag provided');
		}
		const posTouchTag = JSON.parse(String(posTouchTagString));

		const result = z
			.object({
				posDisplayOrderQrAfterPayment: z.boolean({ coerce: true }),
				posPrefillTermOfUse: z.boolean({ coerce: true }),
				posTabGroups: z
					.object({
						name: z.string().min(1).max(100),
						tabs: z
							.object({
								label: z.string().min(1).max(100).optional(),
								color: z.string().min(1).max(100).optional()
							})
							.array()
					})
					.array(),
				posTouchTag: z.string().array(),
				tapToPayOnActivationUrl: z.string().trim().optional(),
				tapToPayProvider: z.string().optional()
			})
			.parse({
				...json,
				posTabGroups,
				posTouchTag
			});
		const posTapToPay = {
			processor:
				result.tapToPayProvider && typedInclude(ALL_PAYMENT_PROCESSORS, result.tapToPayProvider)
					? result.tapToPayProvider
					: undefined,
			onActivationUrl: result.tapToPayOnActivationUrl || undefined
		};
		const parsedOptsForPosQrCodeAfterPayment = z
			.object({
				timeBeforeRedirecting: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('10'),
				displayCustomerCta: z.boolean({ coerce: true }).default(false),
				removeBebobLogo: z.boolean({ coerce: true }).default(false)
			})
			.parse(json.posQrCodeAfterPayment ?? {});
		const posQrCodeAfterPayment = {
			...parsedOptsForPosQrCodeAfterPayment,
			timeBeforeRedirecting: Number(parsedOptsForPosQrCodeAfterPayment.timeBeforeRedirecting)
		};
		await persistConfigElement('posPrefillTermOfUse', result.posPrefillTermOfUse);
		runtimeConfig.posPrefillTermOfUse = result.posPrefillTermOfUse;
		await persistConfigElement(
			'posDisplayOrderQrAfterPayment',
			result.posDisplayOrderQrAfterPayment
		);
		runtimeConfig.posDisplayOrderQrAfterPayment = result.posDisplayOrderQrAfterPayment;
		await persistConfigElement('posTouchTag', result.posTouchTag);
		runtimeConfig.posTouchTag = result.posTouchTag;
		await persistConfigElement('posTabGroups', result.posTabGroups);
		runtimeConfig.posTabGroups = result.posTabGroups;
		await persistConfigElement('posQrCodeAfterPayment', posQrCodeAfterPayment);
		runtimeConfig.posQrCodeAfterPayment = posQrCodeAfterPayment;
		await persistConfigElement('posTapToPay', posTapToPay);
		runtimeConfig.posTapToPay = posTapToPay;
		throw redirect(303, `${adminPrefix()}/pos`);
	}
};
