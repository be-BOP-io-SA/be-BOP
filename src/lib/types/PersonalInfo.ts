import type { ObjectId, Timestamp } from 'mongodb';
import type { CountryAlpha2 } from './Country';
import type { UserIdentifier } from './UserIdentifier';
import type { Schedule } from './Schedule';

export interface PersonalInfo extends Timestamp {
	_id: ObjectId;
	user?: UserIdentifier;
	firstName?: string;
	lastName?: string;
	/** May be partial: the identity page saves whatever the customer filled in. */
	address?: {
		street?: string;
		zip?: string;
		city?: string;
		country?: CountryAlpha2;
		state?: string;
	};
	/**
	 * Answers to the two historical opt-ins. Kept as stored, read only by the migration that
	 * gathered them into consentRecords.
	 */
	newsletter?: {
		seller: boolean;
		partner: boolean;
	};
	/**
	 * Opt-ins accepted before consents moved to one record per address (consentRecords). Kept as
	 * stored, read only by the migration that gathered them.
	 */
	consentOptinIds?: string[];
	npub?: string;
	email?: string;
	subscribedSchedule?: Schedule['_id'][];
}
