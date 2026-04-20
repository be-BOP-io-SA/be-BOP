import { getRecentLogs, clearLogs } from '$lib/server/runtime-logs';

export function load() {
	return {
		lines: getRecentLogs().map((l) => ({
			at: l.at.toISOString(),
			stream: l.stream,
			text: l.text
		}))
	};
}

export const actions = {
	clear: () => {
		clearLogs();
		return { success: 'Logs cleared' };
	}
};
