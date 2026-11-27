import type { ObjectId } from 'mongodb';
import type { LanguageKey } from '$lib/translations';
import type { Timestamps } from './Timestamps';

export interface ConsentOptinTranslatableFields {
	label: string;
}

/**
 * A solicitation opt-in offered to customers on /checkout and /identity.
 *
 * A deleted opt-in stays in the collection with `deletedAt` set: customers who accepted it keep
 * their answer, and the consent export must still be able to name it.
 */
export interface ConsentOptin extends ConsentOptinTranslatableFields, Timestamps {
	_id: string;
	enabled: boolean;
	sortOrder: number;
	deletedAt?: Date;
	translations?: Partial<Record<LanguageKey, Partial<ConsentOptinTranslatableFields>>>;
	/**
	 * Every wording the opt-in had, oldest first, the current one last. Compared with the date a
	 * customer accepted it (`ConsentRecord.acceptedAt`), it tells which text they accepted.
	 */
	versions?: ConsentOptinVersion[];
}

/** One wording of an opt-in, in every language, as it was saved. */
export interface ConsentOptinVersion extends ConsentOptinTranslatableFields {
	translations: Partial<Record<LanguageKey, Partial<ConsentOptinTranslatableFields>>>;
	savedAt: Date;
	/** The employee who saved it; absent for the two historical opt-ins created by be-BOP. */
	savedBy?: { userId: ObjectId; alias?: string };
}

/** Name of the form field carrying the ticked opt-ins, on checkout and the identity page. */
export const CONSENT_OPTIN_FIELD = 'consentOptinIds';

/** Ids of the two opt-ins every shop had before opt-ins became editable. */
export const LEGACY_CONSENT_OPTIN_IDS = {
	seller: 'seller',
	partner: 'partner'
} as const;
