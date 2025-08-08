import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { ALL_PAYMENT_PROCESSORS } from '$lib/server/payment-methods.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Tag } from '$lib/types/Tag';
import { set } from '$lib/utils/set';
import { error, redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

async function persistConfigElement<K extends keyof typeof runtimeConfig>(
	key: K,
	value: (typeof runtimeConfig)[K]
) {
	await collections.runtimeConfig.updateOne(
		{
			_id: key
		},
		{
			$set: {
				data: value,
				updatedAt: new Date()
			}
		},
		{
			upsert: true
		}
	);
}

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
		posPrefillTermOfUse: runtimeConfig.posPrefillTermOfUse,
		posDisablePrefillCheckoutAddress: runtimeConfig.posDisablePrefillCheckoutAddress,
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
		const posTouchTagString = formData.get('posTouchTag');
		if (!posTouchTagString) {
			throw error(400, 'No posTouchTag provided');
		}
		const posTouchTag = JSON.parse(String(posTouchTagString));
		const result = z
			.object({
				posDisplayOrderQrAfterPayment: z.boolean({ coerce: true }),
				posPrefillTermOfUse: z.boolean({ coerce: true }),
				posDisablePrefillCheckoutAddress: z.boolean({ coerce: true }),
				posTouchTag: z.string().array(),
				tapToPayOnActivationUrl: z.string(),
				tapToPayProvider: z.string()
			})
			.parse({
				...json,
				posTouchTag
			});
		const posTapToPay = {
			processor: ALL_PAYMENT_PROCESSORS.find((p) => p === result.tapToPayProvider),
			onActivationUrl:
				result.tapToPayOnActivationUrl === '' ? undefined : result.tapToPayOnActivationUrl
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
		await persistConfigElement(
			'posDisablePrefillCheckoutAddress',
			result.posDisablePrefillCheckoutAddress
		);
		runtimeConfig.posDisablePrefillCheckoutAddress = result.posDisablePrefillCheckoutAddress;
		await persistConfigElement('posTouchTag', result.posTouchTag);
		runtimeConfig.posTouchTag = result.posTouchTag;
		await persistConfigElement('posQrCodeAfterPayment', posQrCodeAfterPayment);
		runtimeConfig.posQrCodeAfterPayment = posQrCodeAfterPayment;
		await persistConfigElement('posTapToPay', posTapToPay);
		runtimeConfig.posTapToPay = posTapToPay;
		throw redirect(303, `${adminPrefix()}/pos`);
	}
};
