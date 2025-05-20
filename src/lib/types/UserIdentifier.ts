import type { ObjectId } from 'mongodb';

export interface UserIdentifier {
	userId?: ObjectId;
	email?: string;
	npub?: string;
	sessionId?: string;
	ssoIds?: string[];

	/** Not really identifiers, more like audit/metadata */
	userLogin?: string;
	userRoleId?: string;
	userAlias?: string;
	userHasPosOptions?: boolean;
}
