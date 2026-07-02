<script lang="ts">
	import PaymentMethodSelector from '$lib/components/PaymentMethodSelector.svelte';
	import ProductItem from '$lib/components/ProductItem.svelte';
	import SubscriptionDurationLabel from '$lib/components/SubscriptionDurationLabel.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n';
	import type { PaymentMethod } from '$lib/server/payment-methods';

	const { t, locale } = useI18n();

	export let data;
	export let form;

	let changingMethod = !data.payment.lastPaidMethodStillEligible;
	let chosenMethod: PaymentMethod | '' =
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

	<form action="?/renew" method="post" class="flex flex-col gap-3 items-start w-full max-w-md">
		{#if data.canRenew}
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
				<PaymentMethodSelector
					methods={data.payment.eligibleMethods}
					bind:value={chosenMethod}
					posSubtypes={data.payment.posSubtypes}
				/>
			{/if}

			<button
				class="btn btn-black"
				disabled={(!data.payment.lastPaidMethodStillEligible && !chosenMethod) ||
					(changingMethod && !chosenMethod)}>{t('subscription.cta.renew')}</button
			>
		{:else}
			<p class="text-sm text-gray-600">
				<Trans key="subscription.canRenewFrom"
					><time datetime={data.canRenewAfter.toJSON()} slot="0"
						>{new Date(data.canRenewAfter).toLocaleString($locale)}</time
					></Trans
				>
			</p>
		{/if}
	</form>

	{#if data.upcomingPhases.length || data.snapshot}
		<section class="w-full max-w-md flex flex-col gap-1">
			<h2 class="text-lg font-medium">{t('subscription.upcomingPhases.title')}</h2>
			<ul class="text-sm text-gray-700 flex flex-col gap-1">
				{#each data.upcomingPhases as phase}
					<li>
						- {t('subscription.upcomingPhases.range', {
							start: new Date(phase.start).toLocaleDateString($locale),
							end: new Date(phase.end).toLocaleDateString($locale)
						})} : {phase.amount === 0
							? t('subscription.amountFree')
							: `${phase.amount} ${phase.currency}`}
					</li>
				{/each}
				<li>
					- {t('subscription.upcomingPhases.after', {
						start: new Date(data.postScheduleStart).toLocaleDateString($locale)
					})} : {data.product.priceAmount === 0
						? t('subscription.amountFree')
						: `${data.product.priceAmount} ${data.product.priceCurrency}`}
				</li>
			</ul>
		</section>
	{/if}

	{#if data.orderHistory.length}
		<section class="w-full max-w-md flex flex-col gap-1">
			<h2 class="text-lg font-medium">{t('subscription.orderHistory.title')}</h2>
			<ul class="text-sm text-gray-700 flex flex-col gap-1">
				{#each data.orderHistory as order}
					<li>
						- <a href="/order/{order._id}" target="_blank" rel="noreferrer" class="underline"
							>#{order.number}</a
						>
						- {order.amount === 0
							? t('subscription.amountFree')
							: `${order.amount} ${order.currency}`}
						{#if order.paidPaymentId}
							-
							<a
								href="/order/{order._id}/payment/{order.paidPaymentId}/receipt"
								target="_blank"
								rel="noreferrer"
								class="underline">{t('subscription.orderHistory.downloadInvoice')}</a
							>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>
