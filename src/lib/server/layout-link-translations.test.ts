import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from './test-utils';
import { collections, withTransaction } from './database';
import { migrations } from './migrations';
import { runtimeConfig } from './runtime-config';
import { actions } from '../../routes/(app)/admin[[hash=admin_hash]]/layout/translations/+page.server';

type Link = { id: string; label: string; href: string };

async function upsertConfig(id: string, data: unknown) {
	await collections.runtimeConfig.updateOne(
		{ _id: id as never },
		{
			$set: { data: data as never, updatedAt: new Date() },
			$setOnInsert: { createdAt: new Date() }
		},
		{ upsert: true }
	);
}

describe('layout link id migration (#2636)', () => {
	const migration = migrations.find((m) => m._id.toString() === '6b1f4880e92e590e85af2636');

	beforeEach(async () => {
		await cleanDb();
	});

	async function run() {
		await withTransaction(async (session) => {
			if (!migration) {
				throw new Error('migration #2636 must exist');
			}
			await migration.run(session);
		});
	}

	it('backfills ids on customized main links and re-keys positional overrides to those ids', async () => {
		// Legacy shape: main links + a per-locale override, both keyed by array position (no id).
		await upsertConfig('topbarLinks', [
			{ label: 'Accueil', href: '/home' },
			{ label: 'Blog', href: '/blog' }
		]);
		await upsertConfig('translations.en.config', {
			topbarLinks: [
				{ label: 'Home', href: '/home' },
				{ label: '', href: '' } // untranslated second row → dropped
			]
		});

		await run();

		const main = ((await collections.runtimeConfig.findOne({ _id: 'topbarLinks' as never }))
			?.data ?? []) as Link[];
		expect(main).toHaveLength(2);
		expect(main[0].id).toBeTruthy();
		expect(main[1].id).toBeTruthy();
		expect(main[0].id).not.toBe(main[1].id);

		const en = (await collections.runtimeConfig.findOne({ _id: 'translations.en.config' as never }))
			?.data as { topbarLinks: Link[] };
		// Only the translated row survives, keyed by the FIRST main link's id (position 0 → id).
		expect(en.topbarLinks).toEqual([{ id: main[0].id, label: 'Home', href: '/home' }]);
	});

	it('re-keys overrides to the default slug ids when main links were never customized', async () => {
		// No topbarLinks doc → migration falls back to the baseConfig default ids by position.
		await upsertConfig('translations.en.config', {
			topbarLinks: [
				{ label: 'Sign in', href: '/login' },
				{ label: 'Search', href: '/searchlist/search' }
			]
		});

		await run();

		const en = (await collections.runtimeConfig.findOne({ _id: 'translations.en.config' as never }))
			?.data as { topbarLinks: Link[] };
		expect(en.topbarLinks.map((l) => l.id)).toEqual(['session', 'search']);
	});
});

describe('layout translations save action (#2636)', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	async function submit(fields: Record<string, string>) {
		const body = new FormData();
		for (const [k, v] of Object.entries(fields)) {
			body.append(k, v);
		}
		const request = new Request('http://localhost/admin/layout/translations', {
			method: 'POST',
			body
		});
		return actions.default({ request } as unknown as Parameters<typeof actions.default>[0]);
	}

	it('persists only translated rows (id-keyed), drops blanks, and does not 422', async () => {
		const result = await submit({
			language: 'en',
			'topbarLinks[0].id': 'session',
			'topbarLinks[0].label': 'Sign in',
			'topbarLinks[0].href': '',
			'topbarLinks[1].id': 'search',
			'topbarLinks[1].label': '',
			'topbarLinks[1].href': ''
		});

		// No validation failure (a partial translation must save).
		expect((result as { status?: number })?.status).not.toBe(422);

		// Only the filled row is stored, keyed by its id; the blank row is dropped.
		const override = runtimeConfig['translations.en.config'] as { topbarLinks?: Link[] };
		expect(override?.topbarLinks).toEqual([{ id: 'session', label: 'Sign in', href: '' }]);
	});
});
