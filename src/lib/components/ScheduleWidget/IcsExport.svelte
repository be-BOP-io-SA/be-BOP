<script lang="ts">
	import type { EventSchedule } from '$lib/types/Schedule';
	import { addMinutes } from 'date-fns';
	import { useI18n } from '$lib/i18n';
	import IconDownloadWindow from '../icons/IconDownloadWindow.svelte';

	export let event: EventSchedule;
	export let pastEventDelay: number;
	let className = '';
	export { className as class };
	const { t } = useI18n();

	function exportToICS(event: EventSchedule) {
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
</script>

<a
	href={exportToICS(event)}
	download="{event.title}.ics"
	title={t('schedule.exportEventTitle')}
	class={className}
>
	<IconDownloadWindow class="h-4 w-auto body-hyperlink" />
</a>
