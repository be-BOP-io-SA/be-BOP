<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/schedule/${$page.params.id}`, name: t('admin.schedule.editTab') },
		...(data.isBookingSchedule
			? [
					{
						href: `${data.adminPrefix}/schedule/${$page.params.id}/system-events`,
						name: t('admin.schedule.systemEventsTab')
					}
			  ]
			: []),
		{
			href: `#`,
			name: t('admin.schedule.translationsTab')
		}
	]}
/>

<slot />
