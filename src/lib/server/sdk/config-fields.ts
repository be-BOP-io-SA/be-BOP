import { z } from 'zod';
import { FIAT_CURRENCIES } from '$lib/types/Currency';
import type { ConfigField, ConfigFields } from '$lib/payment-processors/types';

function fieldSchema(field: ConfigField) {
	if (field.kind === 'currency') {
		return z.enum(FIAT_CURRENCIES);
	}
	if (field.kind === 'boolean') {
		// An unchecked box is absent from the form, and absent must read as false.
		return z.boolean({ coerce: true });
	}
	if (field.prefix) {
		return z.string().startsWith(field.prefix);
	}
	if (field.optional) {
		return z.string().default('');
	}
	if (field.stripTrailingSlashes) {
		return z
			.string()
			.min(1)
			.transform((value) => value.replace(/\/+$/, ''));
	}
	return z.string().min(1);
}

/** What the settings page saves: every declared field, valid. */
export function configSchemaFromFields(
	fields: ConfigFields
): z.ZodObject<Record<string, ReturnType<typeof fieldSchema>>> {
	return z.object(
		Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, fieldSchema(field)]))
	);
}

export function secretFieldsOf(fields: ConfigFields): string[] {
	return Object.keys(fields).filter((name) => fields[name].kind === 'secret');
}

/** A processor can take payments once the shop has typed in every text and secret it must have. */
export function hasEveryCredential(
	fields: ConfigFields,
	config: Record<string, unknown> | undefined
): boolean {
	return Object.entries(fields).every(
		([name, field]) =>
			(field.kind !== 'text' && field.kind !== 'secret') || field.optional || !!config?.[name]
	);
}
