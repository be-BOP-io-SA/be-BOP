<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/schedule/new" class="underline block"
	>{t('admin.schedule.addSchedule')}</a
>
<a href="{data.adminPrefix}/schedule/event-default-picture" class="underline block"
	>{t('admin.schedule.eventDefaultPicture')}</a
>

<h1 class="text-3xl">{t('admin.schedule.listTitle')}</h1>

<ul>
	{#each data.schedules as schedule}
		<li>
			{schedule._id} -
			<a href="{data.adminPrefix}/schedule/{schedule._id}" class="underline body-hyperlink"
				>{schedule.name}</a
			>
		</li>
	{:else}
		{t('admin.schedule.noScheduleYet')}
	{/each}
</ul>
