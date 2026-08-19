<script lang="ts">
	import { browser } from '$app/environment';
	import {
		MAX_DESCRIPTION_LIMIT,
		MAX_NAME_LIMIT,
		MAX_SHORT_DESCRIPTION_LIMIT
	} from '$lib/types/Product';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	let name = data.countdown.name;
	let slug = data.countdown._id;

	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;

	let endsAt = data.countdown.endsAt.toISOString().slice(0, 16);

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.countdown.confirmDelete'))) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="form-label">
		{t('admin.countdown.name')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.countdown.namePlaceholder')}
			bind:value={name}
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
			disabled
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
			value={data.countdown.title}
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
			value={data.countdown.description}
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
	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/countdown/{data.countdown._id}" class="btn body-mainCTA"
			>{t('admin.countdown.view')}</a
		>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value={t('admin.countdown.delete')}
			on:click={confirmDelete}
		/>
	</div>
</form>
