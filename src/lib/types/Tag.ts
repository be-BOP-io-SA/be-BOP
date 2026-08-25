import type { LanguageKey } from '$lib/translations';
import type { Timestamps } from './Timestamps';

export interface TagTranslatableFields {
	title: string;
	subtitle: string;
	content: string;
	shortContent: string;
	cta: {
		label: string;
		href: string;
		openNewTab?: boolean;
	}[];
	menu: {
		label: string;
		href: string;
	}[];
}

export interface Tag extends Timestamps, TagTranslatableFields {
	_id: string;
	name: string;
	family?: string;
	widgetUseOnly: boolean;
	productTagging: boolean;
	useLightDark: boolean;
	reportingFilter: boolean;
	printReceiptFilter: boolean;
	cssOveride: string;
	tagGroupId?: string;

	translations?: Partial<Record<LanguageKey, Partial<TagTranslatableFields>>>;
}

/**
 * Minimal tag projection consumed by the tag widget components and the CMS
 * tag-widget token. Keep the picked fields in sync with the projection in
 * `cms.ts` and the `tag/[id]` page loader.
 */
export type TagWidgetTag = Pick<
	Tag,
	'_id' | 'name' | 'title' | 'subtitle' | 'content' | 'shortContent' | 'cta'
>;
