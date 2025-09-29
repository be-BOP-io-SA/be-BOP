import type { ObjectId } from 'mongodb';

export interface UserIdentifier {
	userId?: ObjectId;
	/** The user's primary email address. Cannot be renamed to keep backwards compatibility. */
	email?: string;
	/** Emails that can be associated with the user (e.g. via SSO). */
	secondaryEmails?: string[];
	npub?: string;
	sessionId?: string;
	ssoIds?: string[];

	/** Not really identifiers, more like audit/metadata */
	userLogin?: string;
	userRoleId?: string;
	userAlias?: string;
	userHasPosOptions?: boolean;
}
