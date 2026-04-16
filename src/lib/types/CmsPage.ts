import type { LanguageKey } from '$lib/translations';
import type { Timestamps } from './Timestamps';

export type CMSContentMode = 'wysiwyg' | 'rawHtml' | 'markdown';

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
	displayRawContent?: boolean;
	contentMode?: CMSContentMode;
	mobileContentMode?: CMSContentMode;
	employeeContentMode?: CMSContentMode;
	metas?: {
		name: string;
		content: string;
	}[];
	translations?: Partial<Record<LanguageKey, Partial<CMSPageTranslatableFields>>>;
}

export const MAX_CONTENT_LIMIT = 300000;
