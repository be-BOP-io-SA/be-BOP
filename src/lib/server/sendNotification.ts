import { ORIGIN } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import type { User } from '$lib/types/User';
import { ObjectId } from 'mongodb';
import { Kind } from 'nostr-tools';
import { runtimeConfig } from './runtime-config';
import { SignJWT } from 'jose';
import { addMinutes } from 'date-fns';
import { adminPrefix } from '$lib/server/admin';
import { error } from '@sveltejs/kit';
import { queueEmail } from './email';
import { isNostrConfigured } from './nostr';
import { PUBLIC_VERSION } from '$env/static/public';

export async function sendResetPasswordNotification(
	user: User,
	opts?: { alternateEmail?: string }
) {
	let email = user.recovery?.email;
	const npub = user.recovery?.npub;

	if (!email && !npub) {
		if (opts?.alternateEmail) {
			email = opts.alternateEmail;
		} else {
			throw error(400, 'User has no recovery email or npub');
		}
	}
	const updatedUser = (
		await collections.users.findOneAndUpdate(
			{ _id: user._id },
			{
				$set: {
					passwordReset: {
						token: crypto.randomUUID(),
						expiresAt: addMinutes(new Date(), 15)
					}
				}
			},
			{
				returnDocument: 'after'
			}
		)
	).value;
	if (!updatedUser) {
		throw new Error('Problem updating user');
	}
	if (npub) {
		const content = `This message was sent to you because you have requested to reset your password.

Follow this link to reset your password: ${ORIGIN}${adminPrefix()}/login/reset/${updatedUser
			.passwordReset?.token}
		
If you didn't ask for this password reset procedure, please ignore this message and do nothing.`;
		await collections.nostrNotifications.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			kind: Kind.EncryptedDirectMessage,
			updatedAt: new Date(),
			content,
			dest: npub
		});
	}
	if (email) {
		await queueEmail(email, 'passwordReset', {
			resetLink: `${ORIGIN}${adminPrefix()}/login/reset/${updatedUser.passwordReset?.token}`
		});
	}

	return {
		email,
		npub
	};
}

export async function sendAuthentificationlink(session: { email?: string; npub?: string }) {
	if (session.npub) {
		const jwt = await new SignJWT({ npub: session.npub })
			.setExpirationTime('1h')
			.setProtectedHeader({ alg: 'HS256' })
			.sign(Buffer.from(runtimeConfig.authLinkJwtSigningKey));

		const content = `This message was sent to you because you have requested a temporary session link.

Follow this link to create your temporary session: ${ORIGIN}/login?token=${encodeURIComponent(jwt)}
		
If you didn't ask for this temporary session procedure, please ignore this message and do nothing.

Best regards,
${runtimeConfig.brandName} team`;
		await collections.nostrNotifications.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			kind: Kind.EncryptedDirectMessage,
			updatedAt: new Date(),
			content,
			dest: session.npub
		});
	}
	if (session.email) {
		const jwt = await new SignJWT({ email: session.email })
			.setExpirationTime('1h')
			.setProtectedHeader({ alg: 'HS256' })
			.sign(Buffer.from(runtimeConfig.authLinkJwtSigningKey));
		await queueEmail(session.email, 'temporarySessionRequest', {
			sessionLink: `${ORIGIN}/login?token=${encodeURIComponent(jwt)}`
		});
	}
}

const BEACON_TARGET_NPUB = 'npub1vqwvj93sezl4c0a4a55ppgejqa37p5g63l3pmzph2asfpha2flxs2dgcz4';

export async function queueTelemetryBeaconMessage() {
	if (!isNostrConfigured()) {
		console.warn('Telemetry beacon: shop has no Nostr key configured, skipping');
		return false;
	}

	const content = `be-BOP Shop Beacon

Shop URL: ${ORIGIN}
be-BOP Version: ${PUBLIC_VERSION || 'unknown'}
Timestamp: ${new Date().toISOString()}

This is an automated telemetry beacon sent with shop owner consent.`;

	await collections.nostrNotifications.insertOne({
		_id: new ObjectId(),
		createdAt: new Date(),
		updatedAt: new Date(),
		kind: Kind.EncryptedDirectMessage,
		content,
		dest: BEACON_TARGET_NPUB
	});

	return true;
}
