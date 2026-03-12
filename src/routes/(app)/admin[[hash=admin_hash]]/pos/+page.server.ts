import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { ALL_PAYMENT_PROCESSORS } from '$lib/server/payment-methods.js';
import { ObjectId } from 'mongodb';
import { runtimeConfig, defaultConfig } from '$lib/server/runtime-config';
import type { Tag } from '$lib/types/Tag';
import type { TagGroup } from '$lib/types/TagGroup';
import { set } from '$lib/utils/set';
import { error, redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import type { Actions } from './$types';

interface RawTagGroup {
	_id: string;
	name: string;
	tagIds: string[];
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

export const load = async ({}) => {
	const [tags, tagGroups] = await Promise.all([
		collections.tags.find({}).project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 }).toArray(),
		collections.tagGroups.find({}).sort({ order: 1 }).toArray()
	]);
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
		tagGroups: tagGroups.map(
			(g): TagGroup => ({
				_id: g._id,
				name: g.name,
				tagIds: g.tagIds,
				order: g.order,
				createdAt: g.createdAt,
				updatedAt: g.updatedAt
			})
		),
		posTouchTag: runtimeConfig.posTouchTag,
		posTabGroups: runtimeConfig.posTabGroups,
		posPoolEmptyIcon: runtimeConfig.posPoolEmptyIcon,
		posPoolOccupiedIcon: runtimeConfig.posPoolOccupiedIcon,
		posMidTicketTopBlankLines: runtimeConfig.posMidTicketTopBlankLines,
		defaultEmptyPoolIcon: defaultConfig.posPoolEmptyIcon,
		defaultFullPoolIcon: defaultConfig.posPoolOccupiedIcon,
		posProductsPerPage: runtimeConfig.posProductsPerPage,
		posMobileBreakpoint: runtimeConfig.posMobileBreakpoint,
		posUseSelectForTags: runtimeConfig.posUseSelectForTags,
		posPrefillTermOfUse: runtimeConfig.posPrefillTermOfUse,
		posDisplayOrderQrAfterPayment: runtimeConfig.posDisplayOrderQrAfterPayment,
		posQrCodeAfterPayment: runtimeConfig.posQrCodeAfterPayment,
		posSession: runtimeConfig.posSession,
		tapToPay: {
			providers: tapToPayProviders,
			currentProcessor: runtimeConfig.posTapToPay.processor,
			onActivationUrl: runtimeConfig.posTapToPay.onActivationUrl ?? ''
		}
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
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

		const tagGroupsString = formData.get('tagGroups');
		const tagGroupsParsed = tagGroupsString
			? JSON.parse(String(tagGroupsString))
					.filter((group: { name: string }) => group.name.trim() !== '')
					.map((group: RawTagGroup, index: number) => ({ ...group, order: index }))
			: [];

		const result = z
			.object({
				posDisplayOrderQrAfterPayment: z.boolean({ coerce: true }),
				posPrefillTermOfUse: z.boolean({ coerce: true }),
				posProductsPerPage: z.number({ coerce: true }).min(0).default(0),
				posMobileBreakpoint: z.number({ coerce: true }).min(500).max(1500).default(1024),
				posUseSelectForTags: z.boolean({ coerce: true }),
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
				posPoolEmptyIcon: z.string().optional(),
				posPoolOccupiedIcon: z.string().optional(),
				posMidTicketTopBlankLines: z.number({ coerce: true }).min(0).max(20).default(3),
				tapToPayOnActivationUrl: z.string().trim().optional(),
				tapToPayProvider: z.string().optional(),
				posSession: z
					.object({
						enabled: z.boolean({ coerce: true }).default(false),
						allowXTicketEditing: z.boolean({ coerce: true }).default(false),
						cashDeltaJustificationMandatory: z.boolean({ coerce: true }).default(false),
						lockItemsAfterMidTicket: z.boolean({ coerce: true }).default(true),
						forbidTouchWhenSessionClosed: z.boolean({ coerce: true }).default(true)
					})
					.default({
						enabled: false,
						allowXTicketEditing: false,
						cashDeltaJustificationMandatory: false,
						lockItemsAfterMidTicket: true,
						forbidTouchWhenSessionClosed: true
					})
			})
			.parse({
				...json,
				posTabGroups,
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
		await persistConfigElement('posTouchTag', result.posTouchTag);
		runtimeConfig.posTouchTag = result.posTouchTag;
		await persistConfigElement('posTabGroups', result.posTabGroups);
		runtimeConfig.posTabGroups = result.posTabGroups;
		const posPoolEmptyIcon = result.posPoolEmptyIcon === '' ? undefined : result.posPoolEmptyIcon;
		const posPoolOccupiedIcon =
			result.posPoolOccupiedIcon === '' ? undefined : result.posPoolOccupiedIcon;
		await persistConfigElement('posPoolEmptyIcon', posPoolEmptyIcon);
		runtimeConfig.posPoolEmptyIcon = posPoolEmptyIcon;
		await persistConfigElement('posPoolOccupiedIcon', posPoolOccupiedIcon);
		runtimeConfig.posPoolOccupiedIcon = posPoolOccupiedIcon;
		await persistConfigElement('posMidTicketTopBlankLines', result.posMidTicketTopBlankLines);
		runtimeConfig.posMidTicketTopBlankLines = result.posMidTicketTopBlankLines;
		await persistConfigElement('posProductsPerPage', result.posProductsPerPage);
		runtimeConfig.posProductsPerPage = result.posProductsPerPage;
		await persistConfigElement('posMobileBreakpoint', result.posMobileBreakpoint);
		runtimeConfig.posMobileBreakpoint = result.posMobileBreakpoint;
		await persistConfigElement('posUseSelectForTags', result.posUseSelectForTags);
		runtimeConfig.posUseSelectForTags = result.posUseSelectForTags;
		await persistConfigElement('posQrCodeAfterPayment', posQrCodeAfterPayment);
		runtimeConfig.posQrCodeAfterPayment = posQrCodeAfterPayment;
		await persistConfigElement('posTapToPay', posTapToPay);
		runtimeConfig.posTapToPay = posTapToPay;
		await persistConfigElement('posSession', result.posSession);
		runtimeConfig.posSession = result.posSession;

		await collections.tagGroups.deleteMany({});
		if (tagGroupsParsed.length > 0) {
			const groupsToInsert = tagGroupsParsed.map((group: RawTagGroup & { order: number }) => ({
				_id: group._id.startsWith('temp-') ? new ObjectId().toHexString() : group._id,
				name: group.name,
				tagIds: group.tagIds,
				order: group.order,
				createdAt: group._id.startsWith('temp-')
					? new Date()
					: new Date(group.createdAt ?? new Date()),
				updatedAt: new Date()
			}));
			await collections.tagGroups.insertMany(groupsToInsert);
		}

		throw redirect(303, `${adminPrefix()}/pos`);
	}
};
