<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<a href="{data.adminPrefix}/countdown/new" class="underline block"
	>{t('admin.countdown.addCountdown')}</a
>

<h1 class="text-3xl">{t('admin.countdown.listTitle')}</h1>

<ul>
	{#each data.countdowns as countdown}
		<li>
			{countdown._id} -
			<a href="{data.adminPrefix}/countdown/{countdown._id}" class="underline body-hyperlink"
				>{countdown.name}</a
			>
		</li>
	{:else}
		{t('admin.countdown.noCountdownYet')}
	{/each}
</ul>
