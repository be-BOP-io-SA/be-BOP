<script lang="ts">
	import PictureComponent from '$lib/components/Picture.svelte';
	import ProductForm from '$lib/components/ProductForm.svelte';

	export let data;
</script>

<h1 class="text-3xl">Add a product</h1>

<ProductForm
	globalDeliveryFees={data.deliveryFees}
	adminPrefix={data.adminPrefix}
	isNew
	duplicateFromId={data.product?._id}
	tags={data.tags}
	productsWithStock={data.productsWithStock}
	product={data.product ?? undefined}
	defaultActionSettings={data.productActionSettings}
	vatProfiles={data.vatProfiles}
	availablePaymentMethods={data.availablePaymentMethods}
/>

{#if data.pictures?.length}
	<h2 class="text-2xl my-4">Photos</h2>

	<div class="flex flex-row flex-wrap gap-6 mt-6">
		{#each data.pictures as picture}
			<div class="flex flex-col text-center">
				<a href="{data.adminPrefix}/picture/{picture._id}" class="flex flex-col items-center">
					<PictureComponent {picture} class="h-36 block" style="object-fit: scale-down;" />
					<span>{picture.name}</span>
				</a>
			</div>
		{/each}
	</div>
{/if}

{#if data.digitalFiles?.length}
	<h2 class="text-2xl my-4">Digital Files</h2>

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
