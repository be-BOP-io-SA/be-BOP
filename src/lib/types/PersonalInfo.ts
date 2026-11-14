import type { ObjectId, Timestamp } from 'mongodb';
import type { CountryAlpha2 } from './Country';
import type { UserIdentifier } from './UserIdentifier';
import type { Schedule } from './Schedule';

export interface PersonalInfo extends Timestamp {
	_id: ObjectId;
	user?: UserIdentifier;
	firstName?: string;
	lastName?: string;
	address?: {
		street: string;
		zip: string;
		city: string;
		country: CountryAlpha2;
		state?: string;
	};
	/**
	 * Answers to the two historical opt-ins. Kept as stored, read only by the migration that
	 * copied them to `consentOptinIds`.
	 */
	newsletter?: {
		seller: boolean;
		partner: boolean;
	};
	/** Ids of the consent opt-ins the customer accepted. */
	consentOptinIds?: string[];
	npub?: string;
	email?: string;
	subscribedSchedule?: Schedule['_id'][];
}
