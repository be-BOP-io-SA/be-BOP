export function timeZoneOffset(): string {
	const timezoneOffsetMinutes = new Date().getTimezoneOffset();

	const offsetHours = Math.abs(Math.floor(timezoneOffsetMinutes / 60));
	const offsetMinutes = Math.abs(timezoneOffsetMinutes % 60);

	const offsetString = `${timezoneOffsetMinutes > 0 ? '-' : '+'}${padZero(offsetHours)}:${padZero(
		offsetMinutes
	)}`;

	return offsetString;
}

function padZero(num: number) {
	return num.toString().padStart(2, '0');
}
