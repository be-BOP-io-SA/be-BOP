import type { ScheduleEvent } from '$lib/types/Schedule';

/**
 * RSVP answers are forwarded to `rsvp.target`, the organiser's private e-mail or npub. Visitors
 * only need to know RSVP is open, so the target is emptied, and an RSVP with none is dropped.
 */
export function hideRsvpTargets<T extends { events: ScheduleEvent[] }>(schedule: T): T {
	return {
		...schedule,
		events: schedule.events.map(({ rsvp, ...event }) => ({
			...event,
			...(rsvp?.target && { rsvp: { target: '' } })
		}))
	};
}
