import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country';
import { CURRENCIES } from '$lib/types/Currency';
import { normalizeMethod } from '$lib/types/DeliveryFees';
import { z } from 'zod';

const deliveryMethodSchema = z.object({
	label: z.string().trim().min(1),
	amount: z.number({ coerce: true }).min(0),
	currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
});

function refineMethods(methods: { label: string }[] | undefined, ctx: z.RefinementCtx) {
	if (!methods?.length) {
		return;
	}
	const seen = new Set<string>();
	methods.forEach((method, index) => {
		const norm = normalizeMethod(method.label);
		if (norm === 'default') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['methods', index, 'label'],
				message: '"Default" is a reserved delivery method label'
			});
		}
		if (seen.has(norm)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['methods', index, 'label'],
				message: 'Duplicate delivery method label'
			});
		}
		seen.add(norm);
	});
}

export const deliveryFeesSchema = z.record(
	z.enum(['default', ...COUNTRY_ALPHA2S]),
	z
		.object({
			amount: z.number({ coerce: true }).min(0),
			currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
			methods: z.array(deliveryMethodSchema).optional()
		})
		.superRefine((value, ctx) => refineMethods(value.methods, ctx))
);

export const deliveryZonesSchema = z.array(
	z
		.object({
			name: z.string().trim().min(1),
			countries: z
				.array(z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]))
				.min(1),
			amount: z.number({ coerce: true }).min(0),
			currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
			// Unchecked checkbox is absent from FormData → default false. Checked → "on" → true.
			enabled: z.boolean({ coerce: true }).default(false),
			methods: z.array(deliveryMethodSchema).optional()
		})
		.superRefine((value, ctx) => refineMethods(value.methods, ctx))
);

export const defaultBlacklistSchema = z.array(
	z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]])
);
