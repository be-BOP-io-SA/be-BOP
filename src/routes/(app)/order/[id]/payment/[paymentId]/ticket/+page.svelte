<script lang="ts">
	import PrintableTicket from '$lib/components/PrintableTicket.svelte';

	export let data;
</script>

<PrintableTicket
	poolLabel="Order #{data.order.number}"
	generatedAt={data.payment.paidAt ?? data.payment.createdAt}
	tagGroups={data.tagGroups}
	priceInfo={data.priceInfo}
	companyInfo={data.companyInfo}
	companyLogoUrl={data.companyLogoUrl}
	showBebopLogo={true}
	showOnScreen={true}
	showGroupHeaders={true}
	sharesInfo={data.sharesInfo}
	peopleCount={data.peopleCount}
	poolOpenedAt={data.poolOpenedAt}
	orderCreatedAt={data.orderCreatedAt}
/>
