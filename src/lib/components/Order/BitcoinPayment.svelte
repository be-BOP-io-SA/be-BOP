<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import IconCopy from '~icons/ant-design/copy-outlined';
	import IconCheckmark from '~icons/ant-design/check-outlined';

	export let payment: SerializedOrderPayment;

	let copiedPaymentAddress = '';

	async function copyAddress(address: string) {
		await navigator.clipboard.writeText(address);
		copiedPaymentAddress = address;
		setTimeout(() => (copiedPaymentAddress = ''), 2000);
	}
</script>

{#if payment.status === 'pending'}
	<ul class="payment-details-list">
		<li class="flex items-center gap-2">
			<code class="break-all">{payment.address}</code>
			<button type="button" class="p-1" on:click={() => copyAddress(payment.address ?? '')}>
				{#if copiedPaymentAddress === payment.address}
					<IconCheckmark class="w-5 h-5 text-green-500" />
				{:else}
					<IconCopy class="w-5 h-5" />
				{/if}
			</button>
		</li>
	</ul>
{/if}
