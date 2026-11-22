import { createHash, randomBytes } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { collections } from './database';
import { POS_ACTIONS, type PosAction } from '$lib/types/PosAction';
import { CUSTOMER_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import type { User } from '$lib/types/User';

/**
 * arm-pos: who may do what on a paired terminal. Operators are be-BOP users; their role says which
 * terminal actions they may take, and they sign in on the terminal with a PIN or an NFC badge.
 */

/** A PIN is typed on the terminal's keypad: digits only. */
const PIN_PATTERN = /^\d{4,12}$/;
/** What a badge holds: a random string be-BOP draws, of letters, either case, and digits. */
const BADGE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const NEW_BADGE_LENGTH = 64;
const BADGE_PATTERN = /^[A-Za-z0-9]{64}$/;
const PREFIX_LENGTH = 6;
/** An operator stays signed in on a terminal this long without using it. */
const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export type PosOperator = { _id: ObjectId; alias: string; actions: PosAction[] };

async function operatorOf(user: User & { _id: ObjectId }): Promise<PosOperator | null> {
	if (user.disabled || user.roleId === CUSTOMER_ROLE_ID) {
		return null;
	}
	const actions =
		user.roleId === SUPER_ADMIN_ROLE_ID
			? [...POS_ACTIONS]
			: (await collections.roles.findOne({ _id: user.roleId }))?.posActions ?? [];
	if (!actions.length) {
		return null;
	}
	return { _id: user._id, alias: user.alias || user.login, actions };
}

/** The users who may sign in on a terminal: a PoS action through their role, and a PIN or a badge. */
export async function terminalOperators(): Promise<PosOperator[]> {
	const users = await collections.users
		.find({
			roleId: { $ne: CUSTOMER_ROLE_ID },
			disabled: { $ne: true },
			$or: [{ posPin: { $exists: true } }, { 'posBadges.0': { $exists: true } }]
		})
		.toArray();
	const operators = await Promise.all(users.map(operatorOf));
	return operators.filter((operator): operator is PosOperator => !!operator);
}

export function isValidPin(pin: string): boolean {
	return PIN_PATTERN.test(pin);
}

export async function setPosPin(userId: ObjectId, pin: string | null): Promise<void> {
	if (pin === null) {
		await collections.users.updateOne({ _id: userId }, { $unset: { posPin: 1 } });
		return;
	}
	if (!isValidPin(pin)) {
		throw new Error('A PIN is 4 to 12 digits');
	}
	await collections.users.updateOne(
		{ _id: userId },
		{ $set: { posPin: await bcryptjs.hash(pin, 10), updatedAt: new Date() } }
	);
}

/** A new badge content, drawn evenly from the badge alphabet. */
function newBadgeIdentifier(): string {
	let identifier = '';
	while (identifier.length < NEW_BADGE_LENGTH) {
		for (const byte of randomBytes(NEW_BADGE_LENGTH)) {
			// 248 is the largest multiple of 62 under 256: above it, a byte would favour some letters.
			if (byte < 248 && identifier.length < NEW_BADGE_LENGTH) {
				identifier += BADGE_ALPHABET[byte % BADGE_ALPHABET.length];
			}
		}
	}
	return identifier;
}

/** A new badge: its identifier is shown once, for the app to write on the badge. */
export async function addPosBadge(userId: ObjectId): Promise<string> {
	const identifier = newBadgeIdentifier();
	await collections.users.updateOne(
		{ _id: userId },
		{
			$push: {
				posBadges: {
					_id: new ObjectId(),
					hash: sha256(identifier),
					prefix: identifier.slice(0, PREFIX_LENGTH),
					createdAt: new Date()
				}
			}
		}
	);
	return identifier;
}

/** Gives a badge a new identifier, to write on it again: the old one stops working. */
export async function renewPosBadge(userId: ObjectId, badgeId: ObjectId): Promise<string> {
	const identifier = newBadgeIdentifier();
	await collections.users.updateOne(
		{ _id: userId, 'posBadges._id': badgeId },
		{
			$set: {
				'posBadges.$.hash': sha256(identifier),
				'posBadges.$.prefix': identifier.slice(0, PREFIX_LENGTH),
				'posBadges.$.createdAt': new Date()
			},
			$unset: { 'posBadges.$.suspendedAt': 1 }
		}
	);
	return identifier;
}

export async function setPosBadgeSuspended(
	userId: ObjectId,
	badgeId: ObjectId,
	suspended: boolean
): Promise<void> {
	await collections.users.updateOne(
		{ _id: userId, 'posBadges._id': badgeId },
		suspended
			? { $set: { 'posBadges.$.suspendedAt': new Date() } }
			: { $unset: { 'posBadges.$.suspendedAt': 1 } }
	);
}

export async function removePosBadge(userId: ObjectId, badgeId: ObjectId): Promise<void> {
	await collections.users.updateOne({ _id: userId }, { $pull: { posBadges: { _id: badgeId } } });
}

export async function operatorFromPin(userId: ObjectId, pin: string): Promise<PosOperator | null> {
	const user = await collections.users.findOne({ _id: userId });
	if (!user?.posPin || !isValidPin(pin) || !(await bcryptjs.compare(pin, user.posPin))) {
		return null;
	}
	return operatorOf(user);
}

export async function operatorFromBadge(identifier: string): Promise<PosOperator | null> {
	if (!BADGE_PATTERN.test(identifier)) {
		return null;
	}
	const hash = sha256(identifier);
	const user = await collections.users.findOne({ 'posBadges.hash': hash });
	const badge = user?.posBadges?.find((b) => b.hash === hash);
	if (!user || !badge || badge.suspendedAt) {
		return null;
	}
	return operatorOf(user);
}

/** Signs an operator in on one terminal; the token goes in a cookie of that terminal. */
export async function openOperatorSession(
	apiKeyId: ObjectId,
	operatorId: ObjectId
): Promise<string> {
	const token = randomBytes(24).toString('base64url');
	const now = new Date();
	await collections.posOperatorSessions.insertOne({
		_id: new ObjectId(),
		tokenHash: sha256(token),
		apiKeyId,
		userId: operatorId,
		createdAt: now,
		lastSeenAt: now
	});
	return token;
}

/** The operator signed in on this terminal, if still allowed. */
export async function operatorOfSession(
	token: string | undefined,
	apiKeyId: ObjectId
): Promise<PosOperator | null> {
	if (!token) {
		return null;
	}
	const session = await collections.posOperatorSessions.findOne({
		tokenHash: sha256(token),
		apiKeyId
	});
	if (!session || Date.now() - session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
		return null;
	}
	const user = await collections.users.findOne({ _id: session.userId });
	if (!user) {
		return null;
	}
	await collections.posOperatorSessions.updateOne(
		{ _id: session._id },
		{ $set: { lastSeenAt: new Date() } }
	);
	return operatorOf(user);
}

export async function closeOperatorSession(token: string | undefined): Promise<void> {
	if (token) {
		await collections.posOperatorSessions.deleteOne({ tokenHash: sha256(token) });
	}
}
