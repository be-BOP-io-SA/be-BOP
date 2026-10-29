<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let errorMessage = '';
	let loading = false;
</script>

<h1 class="text-3xl">{t('admin.product.bulkAliasChangeTitle')}</h1>

<form
	class="flex flex-col gap-2"
	method="post"
	use:enhance={() => {
		errorMessage = '';
		return async ({ result }) => {
			loading = false;

			if (result.type === 'error') {
				errorMessage = result.error.message;
				return;
			}
		};
	}}
	on:submit|preventDefault={() => (loading = true)}
>
	{#each data.products as product}
		<h2 class="text-2xl">{product.name}</h2>
		<div class="gap-4 mx-4 flex flex-col md:flex-row">
			<label class="w-full">
				{t('admin.product.currentSlugLabel')}
				<input
					class="form-input"
					type="text"
					placeholder={t('admin.product.slugPlaceholder')}
					value={product._id}
					disabled
				/>
			</label>

			<label class="w-full">
				{t('admin.product.aliasLabel')}
				<input
					class="form-input"
					type="text"
					name="{product._id}.alias"
					placeholder={t('admin.product.aliasPlaceholder')}
					value={product.alias?.[1] ?? ''}
				/>
			</label>
		</div>
	{/each}
	{#if errorMessage}
		<span class="text-red-500">{errorMessage}</span>
	{/if}
	<button class="btn btn-black self-start mt-4" type="submit" disabled={loading}
		>{t('admin.action.update')}</button
	>
</form>
