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
 * - A customer signed in through an e-mail or a Nostr link, or through a provider that attests
 *   the e-mail (Google, Facebook, GitHub, Twitter), finds the choice of that address, on
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
import type { ConsentOptin, ConsentOptinVersion } from '$lib/types/ConsentOptin';
import type { ConsentRecord } from '$lib/types/ConsentRecord';

export type ConsentAddress = { kind: 'email' | 'npub'; address: string };

function addressFields(address: ConsentAddress): { email: string } | { npub: string } {
	return address.kind === 'email' ? { email: address.address } : { npub: address.address };
}

/** The wording an opt-in has now, to append to its `versions` when it is saved. */
export function consentOptinVersion(
	optin: Pick<ConsentOptin, 'label' | 'translations'>,
	locals: { user?: { _id: ObjectId; alias?: string } }
): ConsentOptinVersion {
	return {
		label: optin.label,
		translations: optin.translations ?? {},
		savedAt: new Date(),
		...(locals.user && { savedBy: { userId: locals.user._id, alias: locals.user.alias } })
	};
}

/**
 * The versions to append when an opt-in gets a new wording. An opt-in saved before versions were
 * kept also gets its original wording first, dated from its creation.
 */
export function newConsentOptinVersions(
	optin: Pick<ConsentOptin, 'label' | 'translations' | 'versions' | 'createdAt'>,
	next: Pick<ConsentOptin, 'label' | 'translations'>,
	locals: { user?: { _id: ObjectId; alias?: string } }
): ConsentOptinVersion[] {
	return [
		...(optin.versions
			? []
			: [{ label: optin.label, translations: optin.translations ?? {}, savedAt: optin.createdAt }]),
		consentOptinVersion(next, locals)
	];
}

/**
 * The acceptance date of each accepted opt-in: kept for one already accepted, `now` for one just
 * ticked. An opt-in no longer accepted loses its date.
 */
function acceptanceDates(
	record: Pick<ConsentRecord, 'optinIds' | 'acceptedAt'> | null,
	optinIds: string[],
	now: Date
): Record<string, Date> {
	const dates: Record<string, Date> = {};
	for (const id of optinIds) {
		const known = record?.optinIds.includes(id) ? record.acceptedAt?.[id] : undefined;
		if (known) {
			dates[id] = known;
		} else if (!record?.optinIds.includes(id)) {
			dates[id] = now;
		}
	}
	return dates;
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

/**
 * The address a session is signed in with: through an e-mail or a Nostr link, or through a
 * provider that attests the e-mail it releases, which proves the address just as well.
 */
export function signedInConsentAddress(locals: {
	email?: string;
	npub?: string;
	sso?: Array<{ email?: string; emailVerified?: boolean }>;
}): ConsentAddress | null {
	if (locals.email) {
		return { kind: 'email', address: locals.email };
	}
	if (locals.npub) {
		return { kind: 'npub', address: locals.npub };
	}
	const ssoEmail = locals.sso?.find((sso) => sso.email && sso.emailVerified)?.email;
	if (ssoEmail) {
		return { kind: 'email', address: ssoEmail };
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
	const acceptedAt = acceptanceDates(record, optinIds, now);

	if (record) {
		await collections.consentRecords.updateOne({ _id: record._id }, [
			{
				$set: {
					optinIds: { $literal: optinIds },
					acceptedAt: { $literal: acceptedAt },
					updatedAt: now
				}
			},
			{ $unset: otherKind }
		]);
		return;
	}
	if (optinIds.length) {
		// One write that creates or updates: two saves of a first choice at once (a double submit)
		// would otherwise both insert, and the second would fail on the unique address index.
		await collections.consentRecords.updateOne(
			addressFields(address),
			{
				$set: { optinIds, acceptedAt, updatedAt: now },
				$setOnInsert: { _id: new ObjectId(), createdAt: now }
			},
			{ upsert: true }
		);
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
			acceptedAt: acceptanceDates(null, optinIds, now),
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
