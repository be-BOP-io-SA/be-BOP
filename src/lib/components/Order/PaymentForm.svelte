<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let action: string;
	export let mode: 'add' | 'replace';
	export let payment: SerializedOrderPayment | undefined = undefined;
	export let paymentMethods: string[];
	export let posSubtypes: Array<{ slug: string; name: string }> | undefined = undefined;
	export let maxAmount: number | undefined = undefined;
	export let posMode = false;

	let selectedMethod = paymentMethods[0] || 'card';
	let selectedSubtype = posSubtypes?.[0]?.slug || '';

	$: amount = payment?.price.amount || maxAmount || 0;
	$: currency = payment?.price.currency || 'CHF';

	// Short labels for POS
	$: amountLabel = posMode ? t('pos.label.amount') : t('order.addPayment.amount');
	$: methodLabel = posMode ? t('pos.label.method') : t('checkout.payment.method');
	$: submitText =
		mode === 'add'
			? posMode
				? t('pos.btn.add')
				: t('order.addPayment.submit')
			: posMode
			? t('pos.btn.replaceSubmit')
			: t('pos.cta.resendPaymentMethod');
</script>

<form {action} method="post" class="flex flex-col gap-2">
	<!-- Amount input -->
	<label>
		{amountLabel}
		<input
			type="number"
			name="amount"
			class="form-input"
			value={amount}
			max={maxAmount}
			disabled={mode === 'replace'}
			required
		/>
	</label>

	<!-- Currency select -->
	<label>
		{posMode ? t('pos.label.currency') : t('order.addPayment.currency')}
		<select name="currency" class="form-input" disabled>
			<option value={currency}>{currency}</option>
		</select>
	</label>

	<!-- Payment method select -->
	<label>
		{methodLabel}
		<select name="method" class="form-input" bind:value={selectedMethod} required>
			{#each paymentMethods as method}
				<option value={method}>
					{t(`checkout.paymentMethod.${method}`)}
				</option>
			{/each}
		</select>
	</label>

	<!-- POS subtype (conditional) -->
	{#if selectedMethod === 'point-of-sale' && posSubtypes?.length}
		<label>
			{posMode ? t('pos.label.subtype') : t('order.addPayment.posSubtype')}
			<select name="posSubtype" class="form-input" bind:value={selectedSubtype} required>
				{#each posSubtypes as subtype}
					<option value={subtype.slug}>{subtype.name}</option>
				{/each}
			</select>
		</label>
	{/if}

	<!-- Submit button -->
	<button type="submit" class="btn btn-blue">
		{submitText}
	</button>
</form>
