import { z } from 'zod';
import { apiError } from './errors';

/**
 * The query parameters of the public API, each defined once.
 *
 * Every route reads the parameters it takes through one of these, so a given value is answered the
 * same way wherever it is sent: accepted everywhere, or refused everywhere with the same 400. A
 * value that does not fit is never dropped nor replaced by a default — that would answer a question
 * the caller did not ask.
 */

/** A positive whole number written plainly: no sign, no decimals, no leading zero. */
export const positiveIntParam = z
	.string()
	.trim()
	.refine(
		(raw) => /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)),
		'must be a positive integer'
	);

/** A page size, from 1 to `max`. */
export function limitParam(max: number) {
	return z
		.string()
		.trim()
		.refine(
			(raw) => /^[1-9]\d*$/.test(raw) && Number(raw) <= max,
			`must be a whole number between 1 and ${max}`
		);
}

/** An ISO 8601 date-time. */
export const isoDateParam = z
	.string()
	.trim()
	.refine((raw) => !Number.isNaN(new Date(raw).getTime()), 'must be an ISO 8601 date-time');

/** Seconds since the Unix epoch, as a whole number. */
export const epochSecondsParam = z
	.string()
	.trim()
	.refine(
		(raw) => /^(0|[1-9]\d*)$/.test(raw) && Number.isSafeInteger(Number(raw)),
		'must be a whole number of seconds since the Unix epoch'
	);

/** Free text: an id, a label, a tag. */
export const textParam = z.string().trim();

/** One of a closed list of values, case insensitive. */
export function oneOfParam(values: readonly string[]) {
	return z
		.string()
		.transform((raw) => raw.trim().toLowerCase())
		.refine((value) => values.includes(value), `must be one of: ${values.join(', ')}`);
}

export type ApiQueryShape = Record<string, z.ZodTypeAny>;

/**
 * Read the query parameters a route takes, and only those.
 *
 * A parameter sent empty counts as not sent. The first value that does not fit answers 400
 * `VALIDATION_ERROR`, naming the parameter.
 */
export function parseApiQuery<S extends ApiQueryShape>(
	url: URL,
	shape: S
): { data: { [K in keyof S]?: z.output<S[K]> } } | { error: Response } {
	const data: Record<string, unknown> = {};
	for (const [name, schema] of Object.entries(shape)) {
		const raw = url.searchParams.get(name);
		if (raw === null || raw.trim() === '') {
			continue;
		}
		const parsed = schema.safeParse(raw);
		if (!parsed.success) {
			const message = parsed.error.issues[0]?.message ?? 'is invalid';
			return {
				error: apiError(400, 'VALIDATION_ERROR', `${name} ${message}`, { field: name })
			};
		}
		data[name] = parsed.data;
	}
	return { data: data as { [K in keyof S]?: z.output<S[K]> } };
}
