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
	newsletter?: {
		seller: boolean;
		partner: boolean;
	};
	npub?: string;
	email?: string;
	subscribedSchedule?: Schedule['_id'][];
}
