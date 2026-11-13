/**
 * The templates that carry a login credential (reset or session link), with its placeholder.
 * Whoever edits one can send the credential elsewhere, and so takes over the account it is for.
 */
export const CREDENTIAL_TEMPLATE_LINKS = {
	passwordReset: '{{resetLink}}',
	temporarySessionRequest: '{{sessionLink}}'
} as const;
