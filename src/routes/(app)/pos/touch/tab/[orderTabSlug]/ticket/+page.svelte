<script lang="ts">
	import PrintableTicket from '$lib/components/PrintableTicket.svelte';

	export let data;
</script>

<PrintableTicket
	poolLabel={data.poolLabel}
	generatedAt={data.generatedAt}
	tagGroups={data.tagGroups}
	priceInfo={data.priceInfo}
	companyInfo={data.companyInfo}
	companyLogoUrl={data.companyLogoUrl}
	showBebopLogo={data.showBebopLogo}
	showOnScreen={true}
/>
