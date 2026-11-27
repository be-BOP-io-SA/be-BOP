import { z } from 'zod';
import { mayAcceptRepeatedExternalOrderIds, STREAM_SETTING_BOUNDS } from '$lib/types/ApiKey';

/**
 * One stream setting as typed in the admin. An empty field is an answer, not a missing one: it
 * means "no ceiling" for the budget and "never close it" for the lifetime, and it is stored as
 * absent rather than as zero.
 */
function optionalWholeNumber(min: number) {
	return z
		.string()
		.trim()
		.transform((raw) => (raw === '' ? null : Number(raw)))
		.refine((value) => value === null || (Number.isInteger(value) && value >= min), {
			message: `Leave empty, or enter a whole number of at least ${min}`
		});
}

export const optionalStreamSetting = optionalWholeNumber(
	STREAM_SETTING_BOUNDS.maxConcurrentStreams.min
);

const lifetimeBounds = STREAM_SETTING_BOUNDS.streamLifetimeSeconds;
const STREAM_LIFETIME_TOO_LONG = `Enter at most ${lifetimeBounds.max} seconds`;

/** A stream lifetime, which also has to fit in the longest timer a server can set. */
export const streamLifetimeSetting = optionalWholeNumber(lifetimeBounds.min).refine(
	(seconds) => seconds === null || seconds <= lifetimeBounds.max,
	{ message: STREAM_LIFETIME_TOO_LONG }
);

/** What the admin sets on a key, read the same way by its creation form and by its page. */
export const apiKeySettingsShape = {
	maxConcurrentStreams: optionalStreamSetting,
	streamLifetimeSeconds: streamLifetimeSetting,
	ownOrdersOnly: z.boolean(),
	acceptDuplicateExternalOrderIds: z.boolean(),
	canDisableNotifications: z.boolean()
};
export const apiKeySettingsSchema = z.object(apiKeySettingsShape);
export type ApiKeySettings = z.infer<typeof apiKeySettingsSchema>;

export const REPEATED_EXTERNAL_IDS_ON_POS_KEY =
	'Several orders per external id are not available to a key with a point-of-sale right';

/** The one rule for the option, applied to the settings together with the scopes they go with. */
export const repeatedExternalIdsRule: [
	(key: { scopes: readonly string[]; acceptDuplicateExternalOrderIds: boolean }) => boolean,
	{ message: string; path: string[] }
] = [
	(key) => !key.acceptDuplicateExternalOrderIds || mayAcceptRepeatedExternalOrderIds(key.scopes),
	{ message: REPEATED_EXTERNAL_IDS_ON_POS_KEY, path: ['acceptDuplicateExternalOrderIds'] }
];

/** What a key's page validates: its settings, against the rights the key already has. */
export const apiKeySettingsOfKeySchema = apiKeySettingsSchema
	.extend({ scopes: z.array(z.string()) })
	.refine(...repeatedExternalIdsRule);

/** The settings of a posted form, as the schema takes them: an unticked box posts nothing. */
export function apiKeySettingsInput(formData: FormData) {
	return {
		maxConcurrentStreams: String(formData.get('maxConcurrentStreams') ?? ''),
		streamLifetimeSeconds: String(formData.get('streamLifetimeSeconds') ?? ''),
		ownOrdersOnly: !!formData.get('ownOrdersOnly'),
		acceptDuplicateExternalOrderIds: !!formData.get('acceptDuplicateExternalOrderIds'),
		canDisableNotifications: !!formData.get('canDisableNotifications')
	};
}

/**
 * What a refused key settings form answers. The lifetime ceiling and the till rule are told apart
 * from the other refusals because the admin shows them in the shop's language.
 */
export function streamSettingsRefusal(error: z.ZodError): {
	error: z.typeToFlattenedError<unknown>;
	streamLifetimeTooLong: boolean;
	repeatedIdsOnPosKey: boolean;
} {
	const isTooLong = (issue: z.ZodIssue) => issue.message === STREAM_LIFETIME_TOO_LONG;
	const isTillRule = (issue: z.ZodIssue) => issue.message === REPEATED_EXTERNAL_IDS_ON_POS_KEY;
	return {
		error: new z.ZodError(
			error.issues.filter((issue) => !isTooLong(issue) && !isTillRule(issue))
		).flatten(),
		streamLifetimeTooLong: error.issues.some(isTooLong),
		repeatedIdsOnPosKey: error.issues.some(isTillRule)
	};
}
