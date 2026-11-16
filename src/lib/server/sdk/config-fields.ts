import { z } from 'zod';
import type { ConfigFields } from '$lib/payment-processors/types';

/** What the settings page saves: every declared field, filled in. */
export function configSchemaFromFields(fields: ConfigFields) {
	return z.object(Object.fromEntries(Object.keys(fields).map((name) => [name, z.string().min(1)])));
}

export function secretFieldsOf(fields: ConfigFields): string[] {
	return Object.keys(fields).filter((name) => fields[name].kind === 'secret');
}

/** A processor can take payments once the shop has filled in every field. */
export function hasEveryField(
	fields: ConfigFields,
	config: Record<string, unknown> | undefined
): boolean {
	return Object.keys(fields).every((name) => !!config?.[name]);
}
