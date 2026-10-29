<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.oauth.title')}</h1>

{t('admin.oauth.description')}

{#if data.oauth}
	<ul class="list-disc pl-5">
		{#each data.oauth as provider}
			<li>
				<a href="{data.adminPrefix}/oauth/{provider.slug}" class="underline">{provider.name}</a>
			</li>
		{/each}
	</ul>
{/if}

<a href="{data.adminPrefix}/oauth/new" class="underline block">{t('admin.oauth.addIntegration')}</a>
