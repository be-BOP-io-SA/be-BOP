import type { LanguageKey } from '$lib/translations';
import { addMinutes } from 'date-fns';
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
	hideFromList?: boolean;
	calendarColor?: string;
	unavailabity?: {
		label: string;
		isUnavailable: boolean;
	};
	isArchived?: boolean;
	productId?: string;
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
	allowSubscription?: boolean;

	translations?: Partial<Record<LanguageKey, Partial<ScheduleTranslatableFields>>>;
}

export function exportToICS(event: EventSchedule, pastEventDelay: number) {
	const start = new Date(event.beginsAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	const end = event.endsAt
		? new Date(event.endsAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
		: addMinutes(new Date(event.beginsAt), pastEventDelay)
				.toISOString()
				.replace(/[-:]/g, '')
				.split('.')[0] + 'Z';

	const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BebobEvent//EN
BEGIN:VEVENT
UID:${crypto.randomUUID()}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title.replace(/\s+/g, ' ')}
DESCRIPTION:${event.description?.replace(/\s+/g, ' ') || ''}
LOCATION:${event.location?.name || ''}
END:VEVENT
END:VCALENDAR`;

	// Base64
	const base64Data = btoa(unescape(encodeURIComponent(icsContent)));
	return `data:text/calendar;base64,${base64Data}`;
}
