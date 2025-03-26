<script lang="ts">
	import type { EventSchedule } from '$lib/types/Schedule';
	import { addMinutes } from 'date-fns';
	import IconExternalNewWindowOpen from '../icons/IconExternalNewWindowOpen.svelte';

	export let event: EventSchedule;
	export let pastEventDelay: number;

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
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location?.name || ''}
END:VEVENT
END:VCALENDAR`;

		const blob = new Blob([icsContent], { type: 'text/calendar' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
		document.body.appendChild(a);
		a.click();

		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<button on:click={() => exportToICS(event)}>
	<IconExternalNewWindowOpen class="h-5 w-auto body-hyperlink" />
</button>
