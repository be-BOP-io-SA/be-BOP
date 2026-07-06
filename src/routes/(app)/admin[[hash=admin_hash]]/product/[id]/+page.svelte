<script lang="ts">
	import PictureComponent from '$lib/components/Picture.svelte';
	import ProductForm from '$lib/components/ProductForm.svelte';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let canSaveOrder = false;

	function movePicture(pictureId: string, direction: 'left' | 'right') {
		canSaveOrder = true;
		data.pictures = data.pictures
			.map((picture, i) => {
				if (picture._id === pictureId) {
					return {
						...picture,
						order: i + (direction === 'left' ? -1.5 : 1.5)
					};
				}
				return { ...picture, order: i };
			})
			.sort((a, b) => a.order - b.order)
			.map((picture, i) => {
				return {
					...picture,
					order: i
				};
			});
	}
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<ProductForm
	globalDeliveryFees={data.deliveryFees}
	product={data.product}
	tags={data.tags}
	productsWithStock={data.productsWithStock}
	adminPrefix={data.adminPrefix}
	reserved={data.reserved}
	defaultActionSettings={data.productActionSettings}
	sold={data.sold}
	scanned={data.scanned}
	vatProfiles={data.vatProfiles}
	availablePaymentMethods={data.availablePaymentMethods}
	currentBookings={data.currentBookings}
	upcomingBookings={data.upcomingBookings}
/>

<h2 class="text-2xl my-4">{t('admin.product.photos')}</h2>

<a href="{data.adminPrefix}/picture/new?productId={data.product._id}" class="underline">
	{t('admin.product.addPicture')}
</a>

<div class="flex flex-row flex-wrap gap-6 mt-6">
	{#each data.pictures as picture}
		<div class="flex flex-col text-center">
			<a href="{data.adminPrefix}/picture/{picture._id}" class="flex flex-col items-center">
				<PictureComponent {picture} class="h-36 block" style="object-fit: scale-down;" />
				<span>{picture.name}</span>
			</a>

			{#if data.pictures.length >= 2}
				<div class="flex justify-center space-between mt-2">
					<button
						class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
						on:click={() => movePicture(picture._id, 'left')}
						aria-label={t('admin.product.moveLeft')}
					>
						←
					</button>
					<button
						class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 ml-2"
						on:click={() => movePicture(picture._id, 'right')}
						aria-label={t('admin.product.moveRight')}
					>
						→
					</button>
				</div>
			{/if}
		</div>
	{/each}
</div>

{#if canSaveOrder}
	<form method="post" action="?/updateOrder">
		{#each data.pictures as picture}
			<input type="hidden" name="pictureId" value={picture._id} />
		{/each}
		<button type="submit" class="btn btn-black mt-4"> {t('admin.product.saveOrder')} </button>
	</form>
{/if}

{#if data.product.type !== 'donation'}
	<h2 class="text-2xl my-4">{t('admin.product.digitalFiles')}</h2>

	<a href="{data.adminPrefix}/digital-file/new?productId={data.product._id}" class="underline">
		{t('admin.product.addDigitalFile')}
	</a>

	<div class="flex flex-row flex-wrap gap-6 mt-6">
		{#each data.digitalFiles as digitalFile}
			<a
				href="{data.adminPrefix}/digital-file/{digitalFile._id}"
				class="body-hyperlink hover:underline"
			>
				{digitalFile.name}
			</a>
		{/each}
	</div>
{/if}
