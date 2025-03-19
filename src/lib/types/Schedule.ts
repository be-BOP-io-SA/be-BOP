import type { LanguageKey } from '$lib/translations';
import type { Timestamps } from './Timestamps';

export interface EventSchedule {
	title: string;
	slug: string;
	shortDescription?: string;
	description?: string;
	beginsAt: Date;
	endsAt?: Date;
	location?: {
		name: string;
		link: string;
	};
	url?: string;
	unavailabity?: {
		label: string;
		isUnavailable: boolean;
	};
	isArchived?: boolean;
}

export interface ScheduleTranslatableFields {
	events: EventSchedule[];
}

export interface Schedule extends Timestamps, ScheduleTranslatableFields {
	_id: string;
	name: string;
	pastEventDelay: number;
	displayPastEvents: boolean;
	displayPastEventsAfterFuture: boolean;
	sortByEventDateDesc: boolean;

	translations?: Partial<Record<LanguageKey, Partial<ScheduleTranslatableFields>>>;
}
