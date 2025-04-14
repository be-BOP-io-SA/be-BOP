<script lang="ts">
	import { exportToICS, type EventSchedule } from '$lib/types/Schedule';
	import { useI18n } from '$lib/i18n';
	import IconDownloadWindow from '../icons/IconDownloadWindow.svelte';

	export let event: EventSchedule;
	export let pastEventDelay: number;
	let className = '';
	export { className as class };
	const { t } = useI18n();
</script>

<a
	href={exportToICS(event, pastEventDelay)}
	download="{event.title}.ics"
	title={t('schedule.exportEventTitle')}
	class={className}
>
	<IconDownloadWindow class="h-4 w-auto body-hyperlink" />
</a>
