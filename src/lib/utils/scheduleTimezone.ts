export function getScheduleTimezone(schedule: { timezone?: string }) {
	return schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
export function offsetFromUTC(timeZone: string): number {
	const now = new Date();

	const partsUTC = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(now);

	const partsTZ = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(now);

	const get = (parts: Intl.DateTimeFormatPart[], type: string): number =>
		parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

	const minutesUTC = get(partsUTC, 'hour') * 60 + get(partsUTC, 'minute');
	const minutesTZ = get(partsTZ, 'hour') * 60 + get(partsTZ, 'minute');

	return minutesUTC - minutesTZ;
}
