import { z } from 'zod';

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
