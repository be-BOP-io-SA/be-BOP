<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	let loading = false;
</script>

<h1 class="text-3xl">{t('admin.product.noContact.title')}</h1>

<p>{t('admin.product.noContact.hint')}</p>

<form
	class="flex flex-col gap-2"
	method="post"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update({ reset: false });
			loading = false;
		};
	}}
>
	{#each data.products as product (product._id)}
		<label class="checkbox-label" class:text-gray-400={!product.canChange}>
			<input
				type="checkbox"
				class="form-checkbox"
				name="allowed"
				value={product._id}
				checked={product.allowOrderWithoutContactAddress}
				disabled={!product.canChange}
			/>
			{product.name}
		</label>
		{#if product.canChange}
			<input type="hidden" name="editable" value={product._id} />
		{/if}
	{/each}

	{#if form?.noLongerEditable}
		<p class="text-red-500">
			{t('admin.product.noContact.noLongerEditable', {
				products: form.noLongerEditable.join(', ')
			})}
		</p>
	{/if}
	{#if form?.success}
		<p class="alert-success">{t('admin.config.valuesUpdated')}</p>
	{/if}

	<button class="btn btn-black self-start mt-4" type="submit" disabled={loading}
		>{t('admin.action.update')}</button
	>
</form>
