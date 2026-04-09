export function formatDuration(beginsAt: Date | string, endsAt: Date | string): string {
	const minutes = Math.round((new Date(endsAt).getTime() - new Date(beginsAt).getTime()) / 60000);
	if (minutes >= 1440) {
		const days = Math.round(minutes / 1440);
		return `${days}d`;
	}
	if (minutes >= 60) {
		const hours = Math.floor(minutes / 60);
		const rem = minutes % 60;
		return rem ? `${hours}h${rem}m` : `${hours}h`;
	}
	return `${minutes}m`;
}
