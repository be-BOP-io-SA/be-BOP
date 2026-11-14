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
}

/** Ids of the two opt-ins every shop had before opt-ins became editable. */
export const LEGACY_CONSENT_OPTIN_IDS = {
	seller: 'seller',
	partner: 'partner'
} as const;
