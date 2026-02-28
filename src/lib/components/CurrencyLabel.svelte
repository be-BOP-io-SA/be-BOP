<script lang="ts">
	import IconInfo from '$lib/components/icons/IconInfo.svelte';
	import { useI18n } from '$lib/i18n';

	export let label: string;

	const { t } = useI18n();
</script>

<div class="flex items-center gap-2">
	{label}
	<a
		href={t('pos.label.currencyCodeHelpUrl')}
		target="_blank"
		rel="noopener noreferrer"
		title={t('pos.label.currencyCodeHelp')}
		class="cursor-pointer text-gray-600 hover:text-gray-800"
	>
		<IconInfo />
	</a>
</div>
