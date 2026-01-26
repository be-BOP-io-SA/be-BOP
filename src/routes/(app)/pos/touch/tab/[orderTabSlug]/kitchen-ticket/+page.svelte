<script lang="ts">
	import PrintableTicket from '$lib/components/PrintableTicket.svelte';

	export let data;
</script>

<PrintableTicket
	poolLabel={data.poolLabel}
	generatedAt={data.generatedAt}
	tagGroups={data.tagGroups}
	showBebopLogo={data.showBebopLogo}
	showOnScreen={true}
	showGroupHeaders={true}
	topBlankLines={data.topBlankLines}
/>
