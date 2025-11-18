<script context="module" lang="ts">
	import type { PaymentMethod } from '$lib/server/payment-methods';

	export type PaymentOption = {
		method: PaymentMethod;
		subtype: string | null;
		label: string;
		icon: string;
	};
</script>

<script lang="ts">
	export let paymentOptions: PaymentOption[] = [];
	export let selectedIndex = 0;

	$: if (selectedIndex >= paymentOptions.length) {
		selectedIndex = 0;
	}
</script>

{#if paymentOptions.length > 0}
	<div class="grid grid-cols-4 gap-2">
		{#each paymentOptions as option, i}
			<button
				type="button"
				class="p-3 rounded text-center {selectedIndex === i
					? 'bg-blue-600 text-white'
					: 'bg-blue-100'}"
				on:click={() => (selectedIndex = i)}
			>
				<div class="text-3xl">{option.icon}</div>
				<div class="text-sm truncate">{option.label}</div>
			</button>
		{/each}
	</div>
{/if}
