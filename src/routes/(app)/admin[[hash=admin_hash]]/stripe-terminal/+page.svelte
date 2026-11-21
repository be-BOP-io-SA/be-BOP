<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.stripeTerminal.title')}</h1>

<p>{t('admin.stripeTerminal.intro')}</p>

{#if !data.stripeConfigured}
	<p>{t('admin.stripeTerminal.stripeFirst')}</p>
{:else}
	{#if data.locations === null}
		<p class="text-red-500">{t('admin.stripeTerminal.listFailed')}</p>
	{:else if data.locations.length}
		<form method="post" action="?/select" class="flex gap-2 items-end">
			<label class="form-label grow">
				{t('admin.stripeTerminal.location')}
				<select name="locationId" class="form-input" value={data.locationId}>
					<option value="">{t('admin.stripeTerminal.none')}</option>
					{#each data.locations as location}
						<option value={location.id}>{location.displayName} ({location.id})</option>
					{/each}
				</select>
			</label>
			<button type="submit" class="btn btn-black">{t('admin.action.save')}</button>
		</form>
	{/if}

	<h2 class="text-2xl">{t('admin.stripeTerminal.createTitle')}</h2>
	{#if data.sellerAddress}
		<p class="text-sm">
			{data.sellerAddress.street}, {data.sellerAddress.zip}
			{data.sellerAddress.city}, {data.sellerAddress.country}
		</p>
		<form method="post" action="?/create" class="flex gap-2 items-end">
			<label class="form-label grow">
				{t('admin.stripeTerminal.name')}
				<input
					type="text"
					name="displayName"
					class="form-input"
					value={data.defaultName}
					required
				/>
			</label>
			<button type="submit" class="btn btn-black">{t('admin.stripeTerminal.create')}</button>
		</form>
	{:else}
		<p>{t('admin.stripeTerminal.addressFirst')}</p>
	{/if}
	{#if form && 'error' in form}
		<p class="text-red-500">
			{form.error === 'address'
				? t('admin.stripeTerminal.addressFirst')
				: t('admin.stripeTerminal.createFailed')}
		</p>
	{/if}
{/if}
