/**
 * Solicitation opt-ins: who may record or change a customer's choice.
 *
 * Functional arbitration (issue #2834). The choice belongs to a contact address, e-mail or npub,
 * not to a browser session, and only whoever proves they control that address may change it:
 *
 * - A visitor who is not signed in records a choice at checkout only for an address that has
 *   none yet: their first order. Ticking nothing records nothing. An address that already has a
 *   choice, or that belongs to a customer who signed in with it, is left untouched — no addition,
 *   no withdrawal — and the visitor is told nothing, which would reveal that the address is known.
 * - A customer signed in through an e-mail or a Nostr link finds the choice of that address, on
 *   checkout and on /identity, and may tick and untick freely. The notification address typed at
 *   checkout does not change whose choice it is.
 * - A record migrated from a customer file holding both an e-mail and an npub is found through
 *   either; the first save made while signed in keeps the address of that sign-in and drops the
 *   other one. Until then the e-mail is the address that counts.
 * - Acceptances of opt-ins the customer was not shown (disabled or deleted ones) are kept.
 */
import type { ClientSession } from 'mongodb';
import { ObjectId } from 'mongodb';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import type { LanguageKey } from '$lib/translations';
import type { ConsentOptin } from '$lib/types/ConsentOptin';
import type { ConsentRecord } from '$lib/types/ConsentRecord';

export type ConsentAddress = { kind: 'email' | 'npub'; address: string };

function addressFields(address: ConsentAddress): { email: string } | { npub: string } {
	return address.kind === 'email' ? { email: address.address } : { npub: address.address };
}

export function consentOptinLabel(
	optin: Pick<ConsentOptin, 'label' | 'translations'>,
	language: LanguageKey
): string {
	return optin.translations?.[language]?.label || optin.label;
}

/**
 * The opt-ins shown to customers on /checkout and /identity: none while the shop does not display
 * opt-ins, otherwise the enabled ones in the order employees chose.
 */
export async function displayedConsentOptins(
	language: LanguageKey
): Promise<Array<{ id: string; label: string }>> {
	if (!runtimeConfig.displayNewsletterCommercialProspection) {
		return [];
	}
	const optins = await collections.consentOptins
		.find({ enabled: true, deletedAt: { $exists: false } })
		.sort({ sortOrder: 1 })
		.toArray();
	return optins.map((optin) => ({ id: optin._id, label: consentOptinLabel(optin, language) }));
}

/** The address a session is signed in with, through an e-mail or a Nostr link. */
export function signedInConsentAddress(locals: {
	email?: string;
	npub?: string;
}): ConsentAddress | null {
	if (locals.email) {
		return { kind: 'email', address: locals.email };
	}
	if (locals.npub) {
		return { kind: 'npub', address: locals.npub };
	}
	return null;
}

export async function findConsentRecord(
	address: ConsentAddress,
	session?: ClientSession
): Promise<ConsentRecord | null> {
	return collections.consentRecords.findOne(addressFields(address), { session });
}

export async function acceptedConsentOptinIds(address: ConsentAddress | null): Promise<string[]> {
	return address ? (await findConsentRecord(address))?.optinIds ?? [] : [];
}

/**
 * Saves the choice of a signed-in customer: the opt-ins they were shown are set to what they
 * ticked, the others are kept, and the record keeps only the address they signed in with.
 */
export async function saveSignedInConsent(params: {
	address: ConsentAddress;
	displayedIds: string[];
	acceptedIds: string[];
}): Promise<void> {
	const { address, displayedIds } = params;
	const acceptedIds = params.acceptedIds.filter((id) => displayedIds.includes(id));
	const record = await findConsentRecord(address);
	const optinIds = [
		...new Set([
			...(record?.optinIds ?? []).filter((id) => !displayedIds.includes(id)),
			...acceptedIds
		])
	];
	const now = new Date();
	const otherKind = address.kind === 'email' ? 'npub' : 'email';

	if (record) {
		await collections.consentRecords.updateOne({ _id: record._id }, [
			{ $set: { optinIds: { $literal: optinIds }, updatedAt: now } },
			{ $unset: otherKind }
		]);
		return;
	}
	if (optinIds.length) {
		await collections.consentRecords.insertOne({
			_id: new ObjectId(),
			...addressFields(address),
			optinIds,
			createdAt: now,
			updatedAt: now
		});
	}
}

/**
 * Saves the choice a visitor who is not signed in made at checkout, for the address they typed.
 * Recorded only for an address with no choice yet and no signed-in customer behind it.
 */
export async function saveFirstConsent(params: {
	address: ConsentAddress;
	displayedIds: string[];
	acceptedIds: string[];
}): Promise<void> {
	const { address, displayedIds } = params;
	const optinIds = [...new Set(params.acceptedIds.filter((id) => displayedIds.includes(id)))];
	if (!optinIds.length) {
		return;
	}
	if (await findConsentRecord(address)) {
		return;
	}
	const signedInCustomer = await collections.personalInfo.findOne(
		address.kind === 'email' ? { 'user.email': address.address } : { 'user.npub': address.address },
		{ projection: { _id: 1 } }
	);
	if (signedInCustomer) {
		return;
	}
	const now = new Date();
	try {
		await collections.consentRecords.insertOne({
			_id: new ObjectId(),
			...addressFields(address),
			optinIds,
			createdAt: now,
			updatedAt: now
		});
	} catch (err) {
		// Two first orders at once for the same address: the first one recorded wins.
		if ((err as { code?: number }).code !== 11000) {
			throw err;
		}
	}
}
