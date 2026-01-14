<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PictureComponent from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import {
		DEFAULT_MAX_QUANTITY_PER_ORDER,
		oneMaxPerLine,
		productPriceWithVariations
	} from '$lib/types/Product.js';
	import { applyAction, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';

	export let data;
	const { t } = useI18n();
	let pictureId = 0;
	let selectedVariations: Record<string, string> = {};
	$: amountAvailable = Math.max(
		Math.min(
			data.product.stock?.available ?? Infinity,
			data.product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER
		),
		0
	);
	let errorMessage = '';
	let quantity = 1;
	let customAmount = data.product.price.amount;
	$: if (data.product.hasVariations) {
		customAmount = productPriceWithVariations(data.product, selectedVariations);
	}
	let loading = false;
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	<form
		id="product-add-form"
		class="p-2 text-center"
		action="/product/{data.product._id}?/addToCart"
		method="post"
		use:enhance={({ action }) => {
			loading = true;

			errorMessage = '';
			return async ({ result }) => {
				loading = false;

				if (result.type === 'error') {
					errorMessage = result.error.message;
					console.log(errorMessage);
					return;
				}

				if (!action.searchParams.has('/addToCart')) {
					return await applyAction(result);
				}

				await invalidate(UrlDependency.Cart);
				document.body.scrollIntoView();
			};
		}}
	>
		<h2 class="flex text-2xl font-bold text-gray-900 mb-8 break-all break-words">
			{data.product.name}
		</h2>

		<div class="grid grid-cols-[auto_auto] w-full mb-8 gap-2">
			<div class="rounded-xl shadow-lg overflow-hidden">
				<PictureComponent
					picture={data.pictures[pictureId]}
					class="object-cover w-full h-full rounded-xl shadow-md"
				/>
			</div>
			{#if data.pictures.length > 1}
				<div class="flex flex-col items-end">
					{#each data.pictures.slice(0, 3) as picture, i}
						<button type="button" on:click={() => (pictureId = i)}>
							<PictureComponent
								{picture}
								class="w-[88px] h-[88px] border-gray-300 border rounded object-cover mb-2 {pictureId ===
								i
									? 'ring-2 ring-link ring-offset-2'
									: ''} "
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<p class="flex text-xl mb-8">
			{data.product.shortDescription}
		</p>

		<div class="flex justify-between items-baseline w-full mb-8">
			<span class="text-3xl font-bold">
				<PriceTag amount={customAmount} currency={data.product.price.currency} main />
			</span>
			<span class="text-xl font-semibold">TTC</span>
		</div>

		<div class="w-full flex flex-col gap-2">
			{#if data.product.standalone && data.product.hasVariations && data.product.variationLabels}
				{#each Object.keys(data.product.variationLabels.values) as key}
					<div class="flex grid-cols-[auto_auto]">
						<label class="font-semibold w-full" for={key}
							>{data.product.variationLabels.names[key]}</label
						>
						<select
							bind:value={selectedVariations[key]}
							id={key}
							name="chosenVariations[{key}]"
							class="w-full font-semibold bg-white"
						>
							{#each Object.entries(data.product.variationLabels.values[key]) as [valueKey, valueLabel]}
								<option value={valueKey}>{valueLabel}</option>
							{/each}
						</select>
					</div>
				{/each}
			{/if}
			<div class="flex justify-between items-baseline w-full mb-8 gap-1">
				{#if !oneMaxPerLine(data.product) && amountAvailable > 0}
					<div class="flex items-center">
						<button
							class="btn border-black border font-bold"
							on:click={() => quantity--}
							type="button"
						>
							-
						</button>
						<select
							name="quantity"
							bind:value={quantity}
							class="form-input w-10 border-0 cursor-pointer rounded appearance-none bg-none bg-transparent font-bold"
						>
							{#each Array(amountAvailable)
								.fill(0)
								.map((_, i) => i + 1) as i}
								<option value={i}>{i}</option>
							{/each}
						</select>
						<button
							class="btn flex border-black border items-center justify-center font-bold"
							on:click={() => quantity++}
							type="button"
						>
							+
						</button>
					</div>
				{/if}
			</div>

			<div class="flex w-full text-lg">
				<p class="mb-2">{data.product.description}</p>
			</div>
		</div>
	</form>
</main>
