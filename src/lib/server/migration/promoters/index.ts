import type { MigrationObjectType } from '$lib/types/MigrationStagedObject';
import type { MigrationPromoter } from '../promoter';
import { cmsPagePromoter } from './cmsPage';
import { settingsPromoter } from './settings';
import { imagePromoter } from './image';
import { productPromoter } from './product';

const promoters: Partial<Record<MigrationObjectType, MigrationPromoter>> = {
	[cmsPagePromoter.type]: cmsPagePromoter,
	[settingsPromoter.type]: settingsPromoter,
	[imagePromoter.type]: imagePromoter,
	[productPromoter.type]: productPromoter
	// Upcoming: theme. Add a file under promoters/ and register it here —
	// no other change is needed in the pipeline.
};

export function getPromoter(type: MigrationObjectType): MigrationPromoter | undefined {
	return promoters[type];
}

export function listPromotableTypes(): MigrationObjectType[] {
	return Object.keys(promoters) as MigrationObjectType[];
}
