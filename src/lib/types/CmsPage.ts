import type { LanguageKey } from '$lib/translations';
import type { Timestamps } from './Timestamps';

export interface CMSPageTranslatableFields {
	title: string;
	shortDescription: string;
	content: string;
	mobileContent?: string;
	employeeContent?: string;
}

export interface CMSPage extends Timestamps, CMSPageTranslatableFields {
	_id: string;
	fullScreen: boolean;
	maintenanceDisplay: boolean;
	hideFromSEO?: boolean;
	hasMobileContent?: boolean;
	hasEmployeeContent?: boolean;
	metas?: {
		name: string;
		content: string;
	}[];
	translations?: Partial<Record<LanguageKey, Partial<CMSPageTranslatableFields>>>;
}

export const MAX_CONTENT_LIMIT = 50000;
