<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import ThresholdsForm from './ThresholdsForm.svelte';

	const { t } = useI18n();

	export let data;
</script>

<main class="max-w-7xl mx-auto px-6 w-full flex flex-col gap-4">
	<h1 class="text-3xl">{t('admin.config.manageConfirmationThresholds')}</h1>

	<h2 class="text-2xl">Bitcoin</h2>
	<ThresholdsForm grid="bitcoin" thresholds={data.confirmationBlocksThresholds} />

	<!-- A Zcash block comes every 75 seconds, eight times as often: it has its own grid. -->
	<h2 class="text-2xl">Zcash</h2>
	<ThresholdsForm grid="zcash" thresholds={data.zcashConfirmationBlocksThresholds} />
</main>
