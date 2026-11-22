<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import BEBOP_LOGO from '$lib/assets/bebop-light.svg';

	export let data;

	const { t, locale } = useI18n();
</script>

<div class="flex flex-col gap-6 text-black bg-white">
	<img src={BEBOP_LOGO} alt="be-BOP" class="h-16 self-start" />
	<h1 class="text-3xl font-bold">{t('admin.certification.certificateTitle')}</h1>
	<p class="italic">{t('admin.certification.placeholder')}</p>
	<table>
		<tbody>
			<tr>
				<td class="pr-4 opacity-70">{t('admin.certification.shop')}</td>
				<td>{data.shop}</td>
			</tr>
			<tr>
				<td class="pr-4 opacity-70">{t('admin.certification.address')}</td>
				<td>{data.address}</td>
			</tr>
			<tr>
				<td class="pr-4 opacity-70">{t('admin.certification.version')}</td>
				<td class="font-mono break-all">{data.version}</td>
			</tr>
			<tr>
				<td class="pr-4 opacity-70">{t('admin.certification.generatedAt')}</td>
				<td>{new Date(data.generatedAt).toLocaleString($locale)}</td>
			</tr>
		</tbody>
	</table>
</div>

<style global>
	@page {
		size: portrait;
	}
	:global(html) {
		print-color-adjust: exact;
		padding: 0.5cm;
		width: 21cm;
	}
</style>
