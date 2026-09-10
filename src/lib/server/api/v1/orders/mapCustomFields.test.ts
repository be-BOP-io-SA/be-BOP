import { describe, expect, it } from 'vitest';
import { mapCustomFields } from './mapCustomFields';

describe('mapCustomFields', () => {
	it('returns empty array when undefined', () => {
		expect(mapCustomFields(undefined)).toEqual([]);
	});

	it('maps values to free CollectedCheckoutField with api:{slug} fieldId', () => {
		expect(
			mapCustomFields({
				table: '12',
				vip: true,
				covers: 3
			})
		).toEqual([
			{
				fieldId: 'api:table',
				slug: 'table',
				name: 'table',
				label: 'table',
				type: 'free',
				value: '12'
			},
			{
				fieldId: 'api:vip',
				slug: 'vip',
				name: 'vip',
				label: 'vip',
				type: 'free',
				value: 'true'
			},
			{
				fieldId: 'api:covers',
				slug: 'covers',
				name: 'covers',
				label: 'covers',
				type: 'free',
				value: '3'
			}
		]);
	});
});
