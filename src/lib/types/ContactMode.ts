export const CONTACT_MODES = ['email', 'nostr'] as const;

export type ContactMode = (typeof CONTACT_MODES)[number];

/**
 * The contact modes a form accepts when the shop offers none: an email, so that the customer
 * can still leave an address the staff can use.
 */
export function contactModesOrEmail(modes: readonly ContactMode[]): ContactMode[] {
	return modes.length ? [...modes] : ['email'];
}
