<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/leaderboard/new" class="underline block"
	>{t('admin.leaderboard.addLeaderboard')}</a
>

<h1 class="text-3xl">{t('admin.leaderboard.listTitle')}</h1>
<ul>
	{#each data.leaderboards as leaderboard}
		<li>
			<a href="{data.adminPrefix}/leaderboard/{leaderboard._id}" class="underline text-blue">
				{leaderboard.name}
			</a>
			-
			<span class="text-gray-550"
				>[{t('admin.leaderboard.leaderboardLabel', { id: leaderboard._id })}]</span
			>
		</li>
	{:else}
		{t('admin.leaderboard.noLeaderboards')}
	{/each}
</ul>
