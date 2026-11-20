<script lang="ts">
	import ThemeForm from '$lib/components/ThemeForm.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.theme.createNew')}</h1>

<form method="post" class="flex flex-col gap-4">
	<ThemeForm />

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.action.submit')}
	/>
</form>
