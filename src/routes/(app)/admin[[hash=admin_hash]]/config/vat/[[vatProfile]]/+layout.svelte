<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	$: currentSelected = $page.params.vatProfile;
</script>

<main class="max-w-7xl mx-auto px-6 w-full flex flex-col gap-4">
	<h1 class="text-3xl">{t('admin.config.manageVatProfiles')}</h1>
	<p>
		{t('admin.config.vatProfilesHint')}
	</p>

	{#if currentSelected}
		<a href="{data.adminPrefix}/config/vat" class="body-hyperlink"
			>{t('admin.config.createNewProfile')}</a
		>
	{/if}

	<h2 class="text-2xl">{t('admin.config.vatProfiles')}</h2>

	{#if !data.vatProfiles.length}
		<p>{t('admin.config.noProfileCreatedYet')}</p>
	{:else}
		<ul class="ml-4 list-disc">
			{#each data.vatProfiles as profile}
				<li>
					{#if currentSelected === profile._id}
						<strong>{profile.name}</strong>
					{:else}
						<a href="{data.adminPrefix}/config/vat/{profile._id}" class="body-hyperlink">
							{profile.name}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<slot />
</main>
