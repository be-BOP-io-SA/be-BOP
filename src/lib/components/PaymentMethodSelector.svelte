<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { PaymentMethod } from '$lib/server/payment-methods';

	export let methods: PaymentMethod[];
	export let value: PaymentMethod | '' = '';
	export let name = 'paymentMethod';
	export let posSubtypes: Array<{ slug: string; name: string }> | undefined = undefined;
	export let required = true;

	const { t } = useI18n();

	// Same pattern as checkout: auto-select the first eligible method when the parent seeds an
	// unusable value (`''` on first mount, or a method that just dropped off the eligible list
	// because the shop disabled it, etc.). Keeps POS operators one click ahead — they hit the
	// screen already primed on their default method.
	$: if (methods.length > 0 && !methods.includes(value as PaymentMethod)) {
		value = methods[0];
	}
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
		<span>{t('checkout.paymentType')}</span>
		<select name="posSubtype" class="form-input" required>
			{#each posSubtypes as subtype}
				<option value={subtype.slug}>
					{subtype.name}
				</option>
			{/each}
		</select>
	</label>
{/if}
