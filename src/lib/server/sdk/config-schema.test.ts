import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { configSchemaFor } from './pp';

describe('configSchemaFor', () => {
	it('accepts a schema that produces the whole config of the processor', () => {
		const schema = configSchemaFor(
			'osb',
			z.object({ shopId: z.string(), password: z.string(), hmacKey: z.string() })
		);

		expect(schema.parse({ shopId: 's', password: 'p', hmacKey: '' })).toEqual({
			shopId: 's',
			password: 'p',
			hmacKey: ''
		});
	});

	it('refuses, at compile time, a schema that leaves out a config field', () => {
		// @ts-expect-error `hmacKey` is part of the OSB config, so pnpm check fails without it
		const schema = configSchemaFor('osb', z.object({ shopId: z.string(), password: z.string() }));

		expect(schema.parse({ shopId: 's', password: 'p' })).toEqual({ shopId: 's', password: 'p' });
	});
});
