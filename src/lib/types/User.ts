import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

export interface User extends Timestamps {
	_id: ObjectId;
	login: string;
	password: string;
	backupInfo?: {
		email?: string;
		nostr?: string;
	};
	roleId: string;
	status?: string;
	lastLoginAt?: Date;
	passwordReset?: {
		token: string;
		expiresAt: Date;
	};
}

export const SUPER_ADMIN_ROLE_ID = 'super-admin';
