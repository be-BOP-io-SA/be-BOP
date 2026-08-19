<script lang="ts">
	import ThemeForm from '$lib/components/ThemeForm.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	function confirmDuplicate(event: Event) {
		if (!confirm(t('admin.theme.overwriteConfirm'))) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">{t('admin.theme.editTitle')}</h1>

<form method="post" action="?/apply" class="mb-4">
	<button type="submit" class="btn btn-blue">{t('admin.theme.applyThisTheme')}</button>
</form>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<ThemeForm theme={data.theme} />
	<div class="flex flex-row gap-4">
		<input
			type="submit"
			class="btn btn-blue self-start text-white"
			value={t('admin.action.submit')}
			formaction="?/update"
		/>
		<input
			type="submit"
			class="btn body-mainCTA self-start"
			value={t('admin.theme.duplicateLightToDark')}
			formaction="?/duplicateToDark"
			on:click={confirmDuplicate}
		/>
		<input
			type="submit"
			class="btn btn-black self-start text-white"
			value={t('admin.theme.duplicateDarkToLight')}
			formaction="?/duplicateToLight"
			on:click={confirmDuplicate}
		/>
	</div>
</form>
