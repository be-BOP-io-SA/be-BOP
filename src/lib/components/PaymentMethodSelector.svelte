<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { PaymentMethod } from '$lib/server/payment-methods';

	export let methods: PaymentMethod[];
	export let value: PaymentMethod | '' = '';
	export let name = 'paymentMethod';
	export let posSubtypes: Array<{ slug: string; name: string }> | undefined = undefined;
	export let required = true;

	const { t } = useI18n();
</script>

<label class="form-label col-span-6">
	{t('checkout.payment.method')}

	<div class="grid grid-cols-2 gap-4 items-center">
		<select {name} class="form-input" bind:value disabled={methods.length === 0} {required}>
			{#each methods as method}
				<option value={method}>
					{t('checkout.paymentMethod.' + method)}
				</option>
			{/each}
		</select>
		{#if methods.length === 0}
			<p class="text-red-400">{t('checkout.paymentMethod.unavailable')}</p>
		{/if}
	</div>
</label>
{#if value === 'point-of-sale' && posSubtypes?.length}
	<label class="form-label col-span-6">
		<span>Payment Type</span>
		<select name="posSubtype" class="form-input" required>
			{#each posSubtypes as subtype}
				<option value={subtype.slug}>
					{subtype.name}
				</option>
			{/each}
		</select>
	</label>
{/if}
