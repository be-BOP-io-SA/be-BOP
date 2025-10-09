<script lang="ts">
	import type { Product } from '$lib/types/Product';

	export let product: Pick<Product, 'variations' | 'variationLabels'>;
	let variationInput: HTMLInputElement[] = [];
	let variationLines = product.variations?.length ? product.variations?.length : 2;

	let variationLabelsNames: string[] = [];
	let variationLabelsValues: string[] = [];
	function isNumber(value: string) {
		return !isNaN(Number(value)) && value.trim() !== '';
	}
	function duplicateVariation(
		variation: { name: string; value: string; price?: number },
		index: number
	) {
		product.variations?.splice(index, 0, variation);
		variationLines++;
	}
	$: variationLabelsToUpdate = product.variationLabels || { names: {}, values: {} };
	function deleteVariationLabel(key: string, valueKey: string) {
		variationLabelsToUpdate = {
			...variationLabelsToUpdate,
			values: {
				...variationLabelsToUpdate?.values,
				[key]: {
					...variationLabelsToUpdate?.values[key]
				}
			}
		};
		delete variationLabelsToUpdate?.values[key][valueKey];
		variationLines -= 1;
		product.variations = product.variations?.filter(
			(vari) => !(key === vari.name && valueKey === vari.value)
		);
		if (Object.keys(variationLabelsToUpdate?.values[key] || []).length === 0) {
			delete variationLabelsToUpdate?.names[key];
			delete variationLabelsToUpdate?.values[key];
		}
	}
</script>

{#each [...(product.variations || []), ...Array(variationLines).fill( { name: '', value: '', price: 0 } )].slice(0, variationLines) as variation, i}
	<div class="flex gap-4">
		<button
			class={i === 0 ? 'mt-8' : ''}
			type="button"
			on:click={() =>
				duplicateVariation(
					product.variations ? product.variations[i] : { name: '', value: '', price: 0 },
					i
				)}>➕</button
		>
		{#if variation.name && variation.value}
			<label class="form-label">
				{i === 0 ? 'Category Id' : ''}
				<input disabled type="text" class="form-input" value={variation.name} />
			</label>
			<label class="form-label">
				{i === 0 ? 'Category Name' : ''}
				<input
					type="text"
					name="variationLabels.names[{variation.name}]"
					class="form-input"
					value={product.variationLabels?.names[variation.name]}
					required={!!product.variationLabels?.values[variation.name]?.[variation.value]}
				/>
			</label>
			<label class="form-label">
				{i === 0 ? 'Value' : ''}
				<input
					type="text"
					name="variationLabels.values[{variation.name}][{variation.value}]"
					class="form-input"
					value={product.variationLabels?.values[variation.name]?.[variation.value]}
					bind:this={variationInput[i]}
					on:input={() => variationInput[i]?.setCustomValidity('')}
					required={!!product.variationLabels?.names[variation.name]}
				/>
			</label>
		{:else}
			<label class="form-label">
				{i === 0 ? 'Category Id' : ''}
				<input disabled type="text" class="form-input" bind:value={variationLabelsNames[i]} />
			</label>
			<label class="form-label">
				{i === 0 ? 'Category Name' : ''}
				<input
					type="text"
					name="variationLabels.names[{(
						(isNumber(variationLabelsNames[i]) ? 'name' : '') + variationLabelsNames[i] || ''
					).toLowerCase()}]"
					class="form-input"
					bind:value={variationLabelsNames[i]}
					required={!!variationLabelsValues[i]}
				/>
			</label>
			<label class="form-label">
				{i === 0 ? 'Value' : ''}
				<input
					type="text"
					name="variationLabels.values[{(
						(isNumber(variationLabelsNames[i]) ? 'name' : '') + variationLabelsNames[i] || ''
					).toLowerCase()}][{isNumber(variationLabelsValues[i])
						? (
								variationLabelsNames[i] +
									(isNumber(variationLabelsNames[i]) ? '-' : '') +
									variationLabelsValues[i] || ''
						  ).toLowerCase()
						: (variationLabelsValues[i] || '').toLowerCase()}]"
					class="form-input"
					bind:value={variationLabelsValues[i]}
					bind:this={variationInput[i]}
					on:input={() => variationInput[i]?.setCustomValidity('')}
					required={!!variationLabelsNames[i]}
				/>
			</label>
		{/if}

		<label class="form-label">
			{#if variation.name && variation.value}
				<input
					type="hidden"
					name="variations[{i}].name"
					class="form-input"
					value={variation.name}
				/>
				<input
					type="hidden"
					name="variations[{i}].value"
					class="form-input"
					value={variation.value}
				/>
			{:else}
				<input
					type="hidden"
					name="variations[{i}].name"
					class="form-input"
					value={(
						(isNumber(variationLabelsNames[i]) ? 'name' : '') + variationLabelsNames[i] || ''
					).toLowerCase()}
				/>
				<input
					type="hidden"
					name="variations[{i}].value"
					class="form-input"
					value={isNumber(variationLabelsValues[i])
						? (
								variationLabelsNames[i] +
									(isNumber(variationLabelsNames[i]) ? '-' : '') +
									variationLabelsValues[i] || ''
						  ).toLowerCase()
						: (variationLabelsValues[i] || '').toLowerCase()}
				/>
			{/if}
			{i === 0 ? 'Price difference' : ''}
			<input
				type="number"
				name="variations[{i}].price"
				class="form-input"
				value={variation.price}
				min="0"
				step="any"
			/>
		</label>
		{#if variation.name && variation.value}
			<button
				class={i === 0 ? 'mt-8' : ''}
				type="button"
				on:click={() => deleteVariationLabel(variation.name, variation.value)}>➖</button
			>
		{/if}
	</div>
{/each}
<button class="btn btn-gray self-start" on:click={() => (variationLines += 1)} type="button">
	Add variation
</button>
