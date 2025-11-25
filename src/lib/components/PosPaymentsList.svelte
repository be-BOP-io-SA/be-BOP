<script lang="ts">
	import PriceTag from '$lib/components/PriceTag.svelte';
	import type { Currency } from '$lib/types/Currency';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payments: Array<{
		number: number;
		amount: number;
		currency: Currency;
		isPaid: boolean;
		status: string;
		method: string;
		createdAt: Date;
		paidAt?: Date;
		orderId?: string;
	}>;
	export let title: string;
	export let bgClass = 'bg-gray-100';
	export let returnTo: string | undefined = undefined;

	function getPaymentLink(payment: (typeof payments)[0]): string | undefined {
		if (!payment.orderId) {
			return undefined;
		}
		const base = `/order/${payment.orderId}`;
		return returnTo ? `${base}?returnTo=${encodeURIComponent(returnTo)}` : base;
	}
</script>

{#if payments.length > 0}
	<div class="{bgClass} rounded-lg p-4">
		<h3 class="font-semibold text-3xl mb-3">{title}</h3>
		<div class="space-y-2">
			{#each payments as payment}
				{@const link = getPaymentLink(payment)}
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-3 text-2xl">
							{#if link}
								<a href={link} class="font-semibold text-blue-600 underline">
									Payment {payment.number}:
								</a>
							{:else}
								<span class="font-semibold">Payment {payment.number}:</span>
							{/if}
							<span class="font-bold">
								<PriceTag amount={payment.amount} currency={payment.currency} />
							</span>
							{#if payment.isPaid}
								<span class="text-green-600 text-3xl">✅</span>
							{:else if payment.status === 'pending'}
								<span class="text-orange-600 text-3xl">⏳</span>
							{:else}
								<span class="text-gray-400 text-3xl">⏸</span>
							{/if}
						</div>
						<div class="text-lg text-gray-600 mt-1">
							{t(`checkout.paymentMethod.${payment.method}`)} •
							{new Date(payment.paidAt || payment.createdAt).toLocaleTimeString('en-GB', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>
					</div>
					{#if link}
						<a href={link} class="bg-blue-600 text-white font-bold px-4 py-2 rounded text-xl">
							View
						</a>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
