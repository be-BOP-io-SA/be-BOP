import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections, withTransaction } from './database';
import { migrations } from './migrations';
import {
	findConsentRecord,
	saveFirstConsent,
	saveSignedInConsent,
	signedInConsentAddress
} from './consentOptins';

const EMAIL = { kind: 'email', address: 'paul@example.com' } as const;
const NPUB = { kind: 'npub', address: 'npub1paul' } as const;
const DISPLAYED = ['x', 'y'];

async function insertRecord(fields: { email?: string; npub?: string; optinIds: string[] }) {
	await collections.consentRecords.insertOne({
		_id: new ObjectId(),
		...fields,
		createdAt: new Date(),
		updatedAt: new Date()
	});
}

describe('consent opt-ins', () => {
	describe('visitor who is not signed in, at checkout', () => {
		it('records the choice of an address that has none yet', async () => {
			await cleanDb();

			await saveFirstConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });

			expect((await findConsentRecord(EMAIL))?.optinIds).toEqual(['x']);
		});

		it('records nothing when no opt-in is ticked', async () => {
			await cleanDb();

			await saveFirstConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: [] });

			expect(await findConsentRecord(EMAIL)).toBeNull();
		});

		it('neither adds nor withdraws anything for an address that already has a choice', async () => {
			await cleanDb();
			await insertRecord({ email: EMAIL.address, optinIds: ['x'] });

			await saveFirstConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['y'] });

			expect((await findConsentRecord(EMAIL))?.optinIds).toEqual(['x']);
		});

		it('records nothing for the address of a customer who signed in with it', async () => {
			await cleanDb();
			await collections.personalInfo.insertOne({
				_id: new ObjectId(),
				user: { email: EMAIL.address }
			} as never);

			await saveFirstConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });

			expect(await findConsentRecord(EMAIL)).toBeNull();
		});
	});

	describe('signed-in customer', () => {
		it('replaces the opt-ins they were shown and keeps the others', async () => {
			await cleanDb();
			await insertRecord({ email: EMAIL.address, optinIds: ['x', 'hidden'] });

			await saveSignedInConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['y'] });

			expect((await findConsentRecord(EMAIL))?.optinIds.sort()).toEqual(['hidden', 'y']);
		});

		it('finds a record holding an e-mail and an npub through the npub, and keeps only the npub', async () => {
			await cleanDb();
			await insertRecord({ email: EMAIL.address, npub: NPUB.address, optinIds: ['x'] });

			expect((await findConsentRecord(NPUB))?.optinIds).toEqual(['x']);

			await saveSignedInConsent({ address: NPUB, displayedIds: DISPLAYED, acceptedIds: ['y'] });

			const record = await findConsentRecord(NPUB);
			expect(record).toMatchObject({ npub: NPUB.address, optinIds: ['y'] });
			expect(record?.email).toBeUndefined();
			expect(await findConsentRecord(EMAIL)).toBeNull();
		});

		it('finds a record holding an e-mail and an npub through the e-mail, and keeps only the e-mail', async () => {
			await cleanDb();
			await insertRecord({ email: EMAIL.address, npub: NPUB.address, optinIds: ['x'] });

			await saveSignedInConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });

			const record = await findConsentRecord(EMAIL);
			expect(record).toMatchObject({ email: EMAIL.address, optinIds: ['x'] });
			expect(record?.npub).toBeUndefined();
			expect(await findConsentRecord(NPUB)).toBeNull();
		});
	});

	describe('address a session is signed in with', () => {
		it('counts an e-mail attested by the sign-in provider like an e-mail sign-in link', () => {
			expect(
				signedInConsentAddress({ sso: [{ email: EMAIL.address, emailVerified: true }] })
			).toEqual(EMAIL);
		});

		it('ignores an e-mail the sign-in provider does not attest', () => {
			expect(signedInConsentAddress({ sso: [{ email: EMAIL.address }] })).toBeNull();
		});
	});

	describe('acceptance dates', () => {
		it('dates each opt-in when it is accepted, and keeps that date on later saves', async () => {
			await cleanDb();
			await saveSignedInConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });
			const first = await findConsentRecord(EMAIL);
			const acceptedX = first?.acceptedAt?.x;
			expect(acceptedX).toBeInstanceOf(Date);

			await saveSignedInConsent({
				address: EMAIL,
				displayedIds: DISPLAYED,
				acceptedIds: ['x', 'y']
			});

			const second = await findConsentRecord(EMAIL);
			expect(second?.acceptedAt?.x?.getTime()).toBe(acceptedX?.getTime());
			expect(second?.acceptedAt?.y).toBeInstanceOf(Date);
		});

		it('drops the date of an opt-in the customer unticks', async () => {
			await cleanDb();
			await saveSignedInConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });

			await saveSignedInConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: [] });

			const record = await findConsentRecord(EMAIL);
			expect(record?.optinIds).toEqual([]);
			expect(record?.acceptedAt?.x).toBeUndefined();
		});

		it('leaves undated an answer given before acceptance dates were kept', async () => {
			await cleanDb();
			await insertRecord({ email: EMAIL.address, optinIds: ['x'] });

			await saveSignedInConsent({
				address: EMAIL,
				displayedIds: DISPLAYED,
				acceptedIds: ['x', 'y']
			});

			const record = await findConsentRecord(EMAIL);
			expect(record?.acceptedAt?.x).toBeUndefined();
			expect(record?.acceptedAt?.y).toBeInstanceOf(Date);
		});

		it('dates the first choice of a visitor who is not signed in', async () => {
			await cleanDb();

			await saveFirstConsent({ address: EMAIL, displayedIds: DISPLAYED, acceptedIds: ['x'] });

			expect((await findConsentRecord(EMAIL))?.acceptedAt?.x).toBeInstanceOf(Date);
		});
	});

	describe('migration of the existing answers', () => {
		it('gathers a customer file holding an e-mail and an npub into one record with both', async () => {
			await cleanDb();
			await collections.personalInfo.insertOne({
				_id: new ObjectId(),
				email: EMAIL.address,
				npub: NPUB.address,
				newsletter: { seller: true, partner: true }
			} as never);
			const migration = migrations.find((m) =>
				m._id.equals(new ObjectId('6b35c2a0e92e590e85af2834'))
			);

			if (!migration) {
				throw new Error('migration not found');
			}

			await withTransaction((session) => migration.run(session));

			const record = await findConsentRecord(EMAIL);
			expect(record).toMatchObject({ email: EMAIL.address, npub: NPUB.address });
			expect(record?.optinIds.sort()).toEqual(['partner', 'seller']);
			expect((await findConsentRecord(NPUB))?._id).toEqual(record?._id);
		});
	});
});
