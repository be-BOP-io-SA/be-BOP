/**
 * What an operator may do on a paired terminal, granted by role: arm-pos rights go by action, not
 * by address, since a terminal's screens are not the back office.
 */
export const POS_ACTIONS = [
	'charge',
	'refund',
	'cancel',
	'tillDown',
	'attachRef',
	'xReport',
	'zReport',
	'unlock'
] as const;
export type PosAction = (typeof POS_ACTIONS)[number];

export interface PosBadge {
	_id: import('mongodb').ObjectId;
	/** SHA-256 of the identifier written on the badge; the identifier itself is never stored. */
	hash: string;
	/** The start of the identifier, to tell badges apart. */
	prefix: string;
	createdAt: Date;
	suspendedAt?: Date;
}
