export function getScheduleTimezone(schedule: { timezone?: string }) {
	return schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
