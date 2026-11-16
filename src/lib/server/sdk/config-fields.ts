import { z } from 'zod';
import { FIAT_CURRENCIES } from '$lib/types/Currency';
import type { ConfigField, ConfigFields } from '$lib/payment-processors/types';

function fieldSchema(field: ConfigField) {
	if (field.kind === 'currency') {
		return z.enum(FIAT_CURRENCIES);
	}
	return field.prefix ? z.string().startsWith(field.prefix) : z.string().min(1);
}

/** What the settings page saves: every declared field, valid. */
export function configSchemaFromFields(fields: ConfigFields) {
	return z.object(
		Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, fieldSchema(field)]))
	);
}

export function secretFieldsOf(fields: ConfigFields): string[] {
	return Object.keys(fields).filter((name) => fields[name].kind === 'secret');
}

/** A processor can take payments once the shop has typed in every text and secret field. */
export function hasEveryCredential(
	fields: ConfigFields,
	config: Record<string, unknown> | undefined
): boolean {
	return Object.entries(fields).every(
		([name, field]) => field.kind === 'currency' || !!config?.[name]
	);
}
