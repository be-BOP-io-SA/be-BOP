import { z } from 'zod';
import { MAX_STREAM_LIFETIME_SECONDS } from '$lib/types/ApiKey';

/**
 * One stream setting as typed in the admin. An empty field is an answer, not a missing one: it
 * means "no ceiling" for the budget and "never close it" for the lifetime, and it is stored as
 * absent rather than as zero.
 */
export const optionalStreamSetting = z
	.string()
	.trim()
	.transform((raw) => (raw === '' ? null : Number(raw)))
	.refine((value) => value === null || (Number.isInteger(value) && value > 0), {
		message: 'Leave empty, or enter a whole number greater than zero'
	});

const STREAM_LIFETIME_TOO_LONG = `Enter at most ${MAX_STREAM_LIFETIME_SECONDS} seconds`;

/** A stream lifetime, which also has to fit in the longest timer a server can set. */
export const streamLifetimeSetting = optionalStreamSetting.refine(
	(seconds) => seconds === null || seconds <= MAX_STREAM_LIFETIME_SECONDS,
	{ message: STREAM_LIFETIME_TOO_LONG }
);

/**
 * What a refused stream settings form answers. The lifetime ceiling is told apart from the other
 * refusals because the admin shows it in the shop's language.
 */
export function streamSettingsRefusal(error: z.ZodError): {
	error: z.typeToFlattenedError<unknown>;
	streamLifetimeTooLong: boolean;
} {
	const isTooLong = (issue: z.ZodIssue) => issue.message === STREAM_LIFETIME_TOO_LONG;
	return {
		error: new z.ZodError(error.issues.filter((issue) => !isTooLong(issue))).flatten(),
		streamLifetimeTooLong: error.issues.some(isTooLong)
	};
}
