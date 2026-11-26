import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// The actions read the schema off the registered processor, so the registry has to exist.
import './pp-registry';
import { paymentConfigActions } from './admin-config';
import { cleanDb } from '../test-utils';
import { collections } from '../database';
import { defaultConfig, runtimeConfig } from '../runtime-config';

/** Deleting restores whatever `runtime-config` declares — the page no longer says it twice. */
const EMPTY = defaultConfig.sumUp;

// The schema comes from the processor now, so this exercises SumUp's real credential rules
// rather than a copy of them that could quietly diverge.
const actions = paymentConfigActions({ key: 'sumUp', processor: 'sumup' });

const form = (fields: Record<string, string>) => {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		body.append(key, value);
	}
	return { request: new Request('http://localhost', { method: 'POST', body }) };
};

const valid = { apiKey: 'sup_sk_live', currency: 'CHF', merchantCode: 'M123' };

describe('paymentConfigActions', () => {
	const initial = { ...runtimeConfig.sumUp };

	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(() => {
		runtimeConfig.sumUp = initial;
	});

	describe('save', () => {
		it('persists the parsed config under its own key', async () => {
			await actions.save(form(valid));

			const stored = await collections.runtimeConfig.findOne({ _id: 'sumUp' });

			expect(stored?.data).toEqual(valid);
		});

		it('applies it to the live config without a restart', async () => {
			await actions.save(form(valid));

			expect(runtimeConfig.sumUp).toEqual(valid);
		});

		it('refuses a malformed credential rather than storing it', async () => {
			await expect(actions.save(form({ ...valid, apiKey: 'wrong-prefix' }))).rejects.toThrow();

			expect(await collections.runtimeConfig.findOne({ _id: 'sumUp' })).toBeNull();
		});

		it('leaves the live config untouched when validation fails', async () => {
			await actions.save(form(valid));
			await expect(actions.save(form({ ...valid, merchantCode: '' }))).rejects.toThrow();

			expect(runtimeConfig.sumUp).toEqual(valid);
		});

		it('overwrites a previous save instead of appending', async () => {
			await actions.save(form(valid));
			await actions.save(form({ ...valid, merchantCode: 'M456' }));

			expect(await collections.runtimeConfig.countDocuments({ _id: 'sumUp' })).toBe(1);
			expect(runtimeConfig.sumUp.merchantCode).toBe('M456');
		});
	});

	describe('delete', () => {
		it('removes the stored document', async () => {
			await actions.save(form(valid));
			await actions.delete();

			expect(await collections.runtimeConfig.findOne({ _id: 'sumUp' })).toBeNull();
		});

		it('resets the live config to the declared empty value', async () => {
			await actions.save(form(valid));
			await actions.delete();

			expect(runtimeConfig.sumUp).toEqual(EMPTY);
		});

		it('touches no other processor key', async () => {
			await collections.runtimeConfig.insertOne({
				_id: 'stripe',
				data: { secretKey: 'sk_other', publicKey: 'pk_other', currency: 'EUR' },
				updatedAt: new Date()
			});

			await actions.delete();

			expect(await collections.runtimeConfig.findOne({ _id: 'stripe' })).not.toBeNull();
		});
	});
});
