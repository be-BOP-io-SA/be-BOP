<script lang="ts">
	import { useI18n } from '$lib/i18n.js';
	import { typedEntries } from '$lib/utils/typedEntries.js';
	import type { CountryAlpha2 } from '$lib/types/Country.js';
	import { page } from '$app/stores';
	import IconDelete from '~icons/ant-design/delete-outlined';

	export let data;

	$: profile = data.vatProfiles.find((p) => p._id === $page.params.vatProfile);

	let rates = typedEntries(profile?.rates ?? {}).map(([country, rate]) => ({
		country: country as CountryAlpha2 | '',
		rate
	}));

	function onProfileChanged() {
		rates = [
			...typedEntries(profile?.rates ?? {}).map(([country, rate]) => ({ country, rate })),
			{ country: '', rate: undefined }
		];
	}

	$: onProfileChanged(), profile;

	$: if (rates.at(-1)?.country && rates.at(-1)?.rate !== undefined) {
		rates = [...rates, { country: '', rate: undefined }];
	}

	const { t, countryName, sortedCountryCodes } = useI18n();
</script>

<h2 class="text-2xl">{profile ? profile.name : t('admin.config.createNewProfile')}</h2>

<form method="post" class="contents">
	<input type="hidden" name="profileId" value={profile?._id ?? 'new'} />

	<label class="form-label">
		{t('admin.config.profileName')}
		<input class="form-input" type="text" name="name" value={profile?.name ?? ''} required />
	</label>

	<div class="grid gap-2" style="grid-template-columns: 1fr 1fr auto;">
		{#each rates as item, i}
			<label class="form-label">
				{t('admin.config.country')}
				<select class="form-input" bind:value={item.country}>
					{#each sortedCountryCodes() as code}
						<option value={code}>{countryName(code)}</option>
					{/each}
				</select>
			</label>

			<label class="form-label">
				{t('admin.config.vatRate')}
				<input
					class="form-input"
					type="number"
					step="0.01"
					min="0"
					max="100"
					name="rates[{item.country}]"
					disabled={!rates[i].country}
					bind:value={rates[i].rate}
					required
				/>
			</label>
			<button
				class="btn btn-red self-end last:hidden"
				type="button"
				on:click={() => (rates = [...rates.slice(0, i), ...rates.slice(i + 1)])}
				><IconDelete /></button
			>
		{/each}
	</div>
	<div class="flex items-center">
		<button class="btn btn-black" formaction="?/saveProfile" formmethod="post">
			{t('admin.action.save')}
		</button>
		<button class="btn btn-red ml-auto" formaction="?/deleteProfile" formmethod="post">
			{t('admin.config.delete')}
		</button>
	</div>
</form>
