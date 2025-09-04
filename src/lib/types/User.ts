import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import { browser } from '$app/environment';

export interface User extends Timestamps {
	_id: ObjectId;
	login: string;
	disabled?: boolean;
	// Not defined until the user logs resets their password
	password?: string;
	recovery?: {
		email?: string;
		npub?: string;
	};
	roleId: string;
	status?: string;
	lastLoginAt?: Date;
	passwordReset?: {
		token: string;
		expiresAt: Date;
	};
	hasPosOptions?: boolean;
	alias?: string;
}

export const SUPER_ADMIN_ROLE_ID = 'super-admin';
export const POS_ROLE_ID = 'point-of-sale';
export const TICKET_CHECKER_ROLE_ID = 'ticket-checker';
export const CUSTOMER_ROLE_ID = 'customer';
export const MIN_PASSWORD_LENGTH = 8;

export async function checkPasswordPwnedTimes(password: string): Promise<number> {
	if (browser && !crypto?.subtle) {
		// Don't block if the browser blocks the crypto API due to non-secure context
		return 0;
	}
	const sha1 = crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
	const sha1Hex = Array.from(new Uint8Array(await sha1))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();

	const pwnedPasswordResp = await fetch(
		`https://api.pwnedpasswords.com/range/${sha1Hex.slice(0, 5)}`,
		{
			autoSelectFamily: true
		} as unknown as RequestInit
	);
	if (!pwnedPasswordResp.ok) {
		// Don't block the user if the API is down
		return 0;
	}
	if (pwnedPasswordResp.ok) {
		const pwnedPasswords = await pwnedPasswordResp.text().then((r) => r.split('\n'));
		const pwnedPassword = pwnedPasswords.find((line) => line.startsWith(sha1Hex.slice(5)));

		if (pwnedPassword) {
			return parseInt(pwnedPassword.split(':')[1]);
		}
	}
	return 0;
}
