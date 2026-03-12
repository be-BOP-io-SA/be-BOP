<script lang="ts">
	import { page } from '$app/stores';
	import Picture from '$lib/components/Picture.svelte';
	import ProductTypeTicket from '$lib/components/ProductType/ProductTypeTicket.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	const productById = Object.fromEntries(data.products.map((product) => [product._id, product]));
	const pictureByProductId = Object.fromEntries(
		data.pictures.map((picture) => [picture.productId, picture])
	);
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col gap-4">
	<a href="/order/{$page.params.id}" class="body-hyperlink hover:underline print:hidden">
		{t('order.backToOrder')}
	</a>

	<h1 class="text-3xl flex gap-2 items-center print:hidden">{t('order.tickets.title')}</h1>

	<button class="print:hidden self-start body-hyperlink" on:click={() => window.print()}>
		{t('ticket.print')}
	</button>

	{#each data.tickets as ticket, i}
		<article class="break-after-page flex flex-col gap-4" style="page-break-after: always;">
			<h1 class="text-2xl print:text-3xl flex gap-2 items-center">
				{#if pictureByProductId[ticket.productId]}
					<Picture
						picture={pictureByProductId[ticket.productId]}
						class="w-10 h-10 object-cover rounded"
					/>
				{/if}
				{productById[ticket.productId]?.name} #{i + 1}
			</h1>
			<ProductTypeTicket class="hidden print:flex self-start" />
			<p>
				{t('ticket.boughtAt', {
					date: new Date(ticket.createdAt).toLocaleDateString(),
					time: new Date(ticket.createdAt).toLocaleTimeString()
				})}
			</p>
			<img src="/ticket/{ticket.ticketId}/qrcode" alt="QR code" class="h-96 w-96" />

			{#if ticket.scanned}
				{@const scannedDate = new Date(ticket.scanned.at)}
				<p>
					{t('ticket.scanned', {
						date: scannedDate.toLocaleDateString(),
						time: scannedDate.toLocaleTimeString()
					})}
				</p>
			{/if}
		</article>
	{/each}
</main>
