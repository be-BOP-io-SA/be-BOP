import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country';
import { CURRENCIES } from '$lib/types/Currency';
import { z } from 'zod';

export const deliveryFeesSchema = z.record(
	z.enum(['default', ...COUNTRY_ALPHA2S]),
	z.object({
		amount: z.number({ coerce: true }).min(0),
		currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
	})
);

export const deliveryZonesSchema = z.array(
	z.object({
		name: z.string().trim().min(1),
		countries: z.array(z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]])).min(1),
		amount: z.number({ coerce: true }).min(0),
		currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
		// Unchecked checkbox is absent from FormData → default false. Checked → "on" → true.
		enabled: z.boolean({ coerce: true }).default(false)
	})
);

export const defaultBlacklistSchema = z.array(
	z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]])
);
