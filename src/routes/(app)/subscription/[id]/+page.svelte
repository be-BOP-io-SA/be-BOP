<script lang="ts">
	import ProductItem from '$lib/components/ProductItem.svelte';
	import SubscriptionDurationLabel from '$lib/components/SubscriptionDurationLabel.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n';

	const { t, locale } = useI18n();

	export let data;
	export let form;

	let changingMethod = !data.payment.lastPaidMethodStillEligible;
	let chosenMethod: string =
		data.payment.lastPaidMethodStillEligible && data.payment.lastPaidMethod
			? data.payment.lastPaidMethod
			: '';
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col gap-4 items-start">
	<h1 class="text-3xl">
		{t('subscription.singleTitle', { number: data.subscription.number })}
	</h1>

	{#if form?.paymentGenerationFailed}
		<div class="alert-error">
			{t('checkout.paymentGenerationFailed')}
		</div>
	{/if}

	<ProductItem product={data.product} picture={data.picture} />

	{#if data.subscription.npub || data.subscription.email}
		<div class="flex flex-col gap-1">
			<p class="font-semibold">{t('subscription.associated.title')}</p>
			{#if data.subscription.npub}
				<p class="ml-4">npub: {data.subscription.npub}</p>
			{/if}
			{#if data.subscription.email}
				<p class="ml-4">email: {data.subscription.email}</p>
			{/if}
		</div>
	{/if}

	<p>
		<Trans key="subscription.initiallyCreated"
			><time datetime={data.subscription.createdAt.toJSON()} slot="0"
				>{new Date(data.subscription.createdAt).toLocaleString($locale)}</time
			></Trans
		>
	</p>

	<p>
		<Trans key="subscription.paidUntil"
			><time datetime={data.subscription.paidUntil.toJSON()} slot="0"
				>{new Date(data.subscription.paidUntil).toLocaleString($locale)}</time
			></Trans
		>
		{#if data.subscription.paidUntil < new Date()}
			<span class="text-red-500">({t('subscription.status.expired')})</span>
		{/if}
	</p>

	<SubscriptionDurationLabel duration={data.product.subscriptionDuration} />

	<p class="text-sm text-gray-600">
		{t('subscription.nextBilling', {
			amount: data.nextBilling.amount,
			currency: data.nextBilling.currency
		})}
	</p>

	<form action="?/renew" method="post" class="flex flex-col gap-3 items-start">
		{#if data.payment.lastPaidMethod && data.payment.lastPaidMethodStillEligible && !changingMethod}
			<p class="text-sm text-gray-600">
				{t('subscription.payment.currentMethod', {
					method: t('checkout.paymentMethod.' + data.payment.lastPaidMethod)
				})}
			</p>
			<button
				type="button"
				class="text-sm underline text-gray-700"
				on:click={() => (changingMethod = true)}
			>
				{t('subscription.payment.change')}
			</button>
		{:else}
			{#if data.payment.lastPaidMethod && !data.payment.lastPaidMethodStillEligible}
				<p class="text-sm text-orange-700">
					{t('subscription.payment.previousUnavailable', {
						method: t('checkout.paymentMethod.' + data.payment.lastPaidMethod)
					})}
				</p>
			{/if}
			<fieldset class="flex flex-col gap-1">
				<legend class="text-sm font-medium">{t('subscription.payment.chooseMethod')}</legend>
				{#each data.payment.eligibleMethods as method}
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" name="paymentMethod" value={method} bind:group={chosenMethod} />
						{t('checkout.paymentMethod.' + method)}
					</label>
				{/each}
			</fieldset>
		{/if}

		<button
			class="btn btn-black"
			disabled={!data.canRenew ||
				(!data.payment.lastPaidMethodStillEligible && !chosenMethod) ||
				(changingMethod && !chosenMethod)}
			title={data.canRenew ? '' : t('subscription.cantRenew')}>{t('subscription.cta.renew')}</button
		>
	</form>
</main>
