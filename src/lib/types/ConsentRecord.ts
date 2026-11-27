import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

/**
 * The opt-ins accepted by one contact address. A record carries a single address, except a
 * record migrated from a customer file that held both an e-mail and an npub: it is found through
 * either, and keeps only the address of the first sign-in that saves it.
 */
export interface ConsentRecord extends Timestamps {
	_id: ObjectId;
	email?: string;
	npub?: string;
	optinIds: string[];
	/**
	 * When each opt-in in `optinIds` was accepted, by opt-in id. Missing for answers given before
	 * this date was kept, whose acceptance date is unknown.
	 */
	acceptedAt?: Record<string, Date>;
}
