<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t, locale } = useI18n();

	export let data;
</script>

<main class="mx-auto max-w-7xl p-6 body-mainPlan flex flex-col gap-6">
	<h1 class="text-3xl">{t('subscription.listTitle')}</h1>

	{#if data.subscriptions.length}
		<ul class="flex flex-col gap-4">
			{#each data.subscriptions as sub}
				<li class="border rounded-lg p-4 flex flex-col gap-2">
					<div class="flex items-center justify-between flex-wrap gap-2">
						<a href="/product/{sub.productId}" class="text-lg font-semibold underline">
							{sub.productName}
						</a>
						{#if sub.isActive}
							<span class="text-green-600 font-medium">{t('subscription.status.active')}</span>
						{:else}
							<span class="text-red-500 font-medium">{t('subscription.status.expired')}</span>
						{/if}
					</div>

					<div class="flex flex-col gap-1 text-sm">
						<p class:text-red-500={!sub.isActive} class:text-green-600={sub.isActive}>
							{t('subscription.expiresOn')}:
							{new Date(sub.paidUntil).toLocaleDateString($locale)}
						</p>
						{#if sub.lastPaymentDate}
							<p>
								{t('subscription.lastPayment')}:
								{new Date(sub.lastPaymentDate).toLocaleDateString($locale)}
							</p>
						{/if}
					</div>

					<div class="flex gap-4 text-sm">
						<a href="/subscription/{sub._id}" class="underline">
							{t('subscription.singleTitle', { number: sub.number })}
						</a>
						{#if sub.lastOrderId}
							<a href="/order/{sub.lastOrderId}" class="underline">
								{t('subscription.lastOrder')}
							</a>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-gray-500">{t('subscription.noSubscriptions')}</p>
	{/if}
</main>
