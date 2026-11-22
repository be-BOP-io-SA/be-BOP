<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	// As for invoices: the certificate is a page ready to print, printed (or saved as PDF) from here.
	let certificateFrame: HTMLIFrameElement;
	let certificateReady = false;
</script>

<h1 class="text-3xl">{t('admin.certification.title')}</h1>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 max-w-2xl">
	<dt class="opacity-70">{t('admin.certification.version')}</dt>
	<dd class="font-mono break-all">{data.version}</dd>
	<dt class="opacity-70">{t('admin.certification.shop')}</dt>
	<dd>{data.shop}</dd>
	<dt class="opacity-70">{t('admin.certification.address')}</dt>
	<dd>{data.address}</dd>
</dl>

<button
	type="button"
	class="btn btn-black self-start"
	disabled={!certificateReady}
	on:click={() => certificateFrame?.contentWindow?.print()}
>
	{t('admin.certification.download')}
</button>

<iframe
	src="{data.adminPrefix}/certification/certificate"
	style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
	title=""
	on:load={() => (certificateReady = true)}
	bind:this={certificateFrame}
></iframe>
