<script lang="ts">
	import { browser } from '$app/environment';
	import {
		MAX_DESCRIPTION_LIMIT,
		MAX_NAME_LIMIT,
		MAX_SHORT_DESCRIPTION_LIMIT
	} from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	let name = '';
	let slug = '';
	let endsAt = new Date().toISOString().slice(0, 16);

	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;
</script>

<h1 class="text-3xl">{t('admin.countdown.addTitle')}</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		{t('admin.countdown.name')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.countdown.namePlaceholder')}
			bind:value={name}
			on:change={() => (slug = generateId(name, true))}
			on:input={() => (slug = generateId(name, true))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.countdown.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.countdown.slug')}
			bind:value={slug}
			title={t('admin.countdown.slugTitle')}
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.countdown.title')}
		<textarea
			name="title"
			cols="30"
			rows="3"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder={t('admin.countdown.titlePlaceholder')}
			class="form-input block w-full"
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.countdown.description')}
		<textarea
			name="description"
			cols="30"
			rows="10"
			maxlength={MAX_DESCRIPTION_LIMIT}
			placeholder={t('admin.countdown.descriptionPlaceholder')}
			class="form-input block w-full"
			required
		/>
	</label>
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			{t('admin.countdown.endAt')}
			{#if browser}{t('admin.countdown.browserZone', { timezoneString })}{/if}
			<input class="form-input" type="datetime-local" required name="endsAt" bind:value={endsAt} />
		</label>
	</div>
	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.countdown.submit')}
	/>
</form>
