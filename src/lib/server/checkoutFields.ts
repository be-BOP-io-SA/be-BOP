import { z } from 'zod';
import { error } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { collections } from '$lib/server/database';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country';
import type {
	CheckoutFieldConfig,
	CheckoutFieldDisplay,
	FreeInputFormat
} from '$lib/types/CheckoutFieldConfig';
import type { CollectedCheckoutField } from '$lib/types/Order';

export function loadEnabledCheckoutFields() {
	return collections.checkoutFieldConfigs
		.find({ disabled: { $ne: true } })
		.sort({ sortOrder: 1 })
		.toArray();
}

export function toDisplayDTO(field: CheckoutFieldConfig): CheckoutFieldDisplay {
	return {
		slug: field.slug,
		label: field.label,
		type: field.type,
		required: field.required,
		options: field.options,
		free: field.free,
		isPersonalData: field.isPersonalData
	};
}

const addressSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	address: z.string().min(1),
	city: z.string().min(1),
	state: z.string().optional(),
	zip: z.string().min(1),
	country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
	phone: z.string().optional(),
	isCompany: z.boolean({ coerce: true }).default(false),
	companyName: z.string().optional(),
	vatNumber: z.string().optional()
});

const freeFormatRegex: Partial<Record<FreeInputFormat, RegExp>> = {
	number: /^\d+$/,
	alphanumeric: /^[a-z0-9]+$/i
};

export function collectCheckoutFieldValues(
	fields: CheckoutFieldConfig[],
	json: JsonObject
): CollectedCheckoutField[] {
	const textParsed = z.record(z.string()).safeParse(json.checkoutField);
	const textValues = textParsed.success ? textParsed.data : {};
	const addressParsed = z.record(z.unknown()).safeParse(json.checkoutFieldAddress);
	const addressValues = addressParsed.success ? addressParsed.data : {};

	return fields.flatMap((field): CollectedCheckoutField[] => {
		const base = {
			fieldId: field._id.toString(),
			slug: field.slug,
			name: field.name,
			label: field.label,
			type: field.type,
			...(field.isPersonalData && { isPersonalData: true })
		};

		switch (field.type) {
			case 'address': {
				const submitted = addressValues[field.slug];
				if (!submitted) {
					if (field.required) {
						throw error(400, `${field.label} is required`);
					}
					return [];
				}
				const parsed = addressSchema.safeParse(submitted);
				if (!parsed.success) {
					throw error(400, `${field.label} is invalid`);
				}
				const address = parsed.data;
				if (address.isCompany) {
					if (!address.companyName) {
						throw error(400, `Company name is required for ${field.label}`);
					}
				} else {
					delete address.companyName;
					delete address.vatNumber;
				}
				return [{ ...base, address }];
			}
			case 'options': {
				const value = (textValues[field.slug] ?? '').trim();
				if (!value) {
					if (field.required) {
						throw error(400, `${field.label} is required`);
					}
					return [];
				}
				if (!field.options?.includes(value)) {
					throw error(400, `Invalid option for ${field.label}`);
				}
				return [{ ...base, value }];
			}
			case 'free': {
				const value = (textValues[field.slug] ?? '').trim();
				if (!value) {
					if (field.required) {
						throw error(400, `${field.label} is required`);
					}
					return [];
				}
				if (field.free?.maxLength && value.length > field.free.maxLength) {
					throw error(400, `${field.label} is too long`);
				}
				const regex = field.free?.format ? freeFormatRegex[field.free.format] : undefined;
				if (regex && !regex.test(value)) {
					throw error(400, `Invalid format for ${field.label}`);
				}
				return [{ ...base, value }];
			}
			default: {
				const exhaustive: never = field.type;
				throw error(500, `Unknown checkout field type: ${String(exhaustive)}`);
			}
		}
	});
}
