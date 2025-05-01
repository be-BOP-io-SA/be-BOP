import type { LanguageKey } from '$lib/translations';
import { addMinutes } from 'date-fns';
import type { Timestamps } from './Timestamps';
import type { Product } from './Product';
import type { SetRequired } from 'type-fest';
import type { ObjectId } from 'mongodb';

export interface ScheduleEvent {
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
	rsvp?: {
		target: string;
	};
	productId?: Product['_id'];
}

export interface ScheduleEventBooked extends SetRequired<ScheduleEvent, 'endsAt'> {
	_id: ObjectId;
	scheduleId: Schedule['_id'];
	orderId: string;
	status: 'pending' | 'confirmed' | 'cancelled';
}

export const defaultSchedule = {
	pastEventDelay: 60,
	displayPastEvents: false,
	displayPastEventsAfterFuture: false,
	sortByEventDateDesc: false,
	allowSubscription: false
} satisfies Partial<Schedule>;

export interface ScheduleTranslatableFields {
	events: ScheduleEvent[];
}

export interface Schedule extends Timestamps, ScheduleTranslatableFields {
	_id: string;
	name: string;
	pastEventDelay: number;
	displayPastEvents: boolean;
	displayPastEventsAfterFuture: boolean;
	sortByEventDateDesc: boolean;
	allowSubscription?: boolean;
	productId?: Product['_id'];

	translations?: Partial<Record<LanguageKey, Partial<ScheduleTranslatableFields>>>;
}

export function exportToICS(event: ScheduleEvent, pastEventDelay: number) {
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

export function productToScheduleId(productId: Product['_id']) {
	return `product:${productId}`;
}

export function scheduleToProductId(scheduleId: string) {
	const match = scheduleId.match(/product:(.+)/);
	if (!match) {
		throw new Error('Invalid schedule ID for a schedule associated with a product');
	}
	return match[1] as Product['_id'];
}

export function minutesToTime(minutes: number) {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

export function timeToMinutes(time: string) {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

export const dayList = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
] as const;

export type Day = (typeof dayList)[number];
