import { describe, expect, it } from 'vitest';
import { renameTranslatedVariationValues } from './product';

const translations = {
	fr: {
		variationLabels: {
			names: { load: 'Charge' },
			values: { load: { load10: 'Dix', load20: 'Vingt' } }
		}
	},
	de: { name: 'Armband' }
};

describe('renameTranslatedVariationValues', () => {
	it('moves the translated label to the new value id', () => {
		const renamed = renameTranslatedVariationValues(translations, { load: { load10: 'b-0042' } });

		expect(renamed?.fr?.variationLabels?.values.load).toEqual({ 'b-0042': 'Dix', load20: 'Vingt' });
		expect(renamed?.de).toEqual({ name: 'Armband' });
		expect(translations.fr.variationLabels.values.load).toHaveProperty('load10');
	});

	it('returns nothing when no translated label had to move', () => {
		expect(
			renameTranslatedVariationValues(translations, { load: { load99: 'x' } })
		).toBeUndefined();
		expect(renameTranslatedVariationValues(translations, undefined)).toBeUndefined();
		expect(renameTranslatedVariationValues(undefined, { load: { load10: 'x' } })).toBeUndefined();
	});
});
