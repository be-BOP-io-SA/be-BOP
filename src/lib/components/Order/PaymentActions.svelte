<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';
	import PaymentForm from './PaymentForm.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let orderStaffActionBaseUrl: string;
	export let roleIsStaff: boolean;
	export let paymentMethods: string[];
	export let posSubtypes:
		| Array<{ slug: string; name: string; paymentDetailRequired?: boolean }>
		| undefined = undefined;
	export let posMode = false;
	export let tapToPayConfigured = false;
	export let tapToPayInUseByOtherOrder = false;
	export let printReceipt: () => void;
	export let printTicket: () => void;
	export let receiptReady = false;
	export let ticketReady = false;

	let openPaymentMethodChange = false;
	let openCashbackSection = false;
	let disableInfoChange = true;
	let paidAmount: number | null = null;

	$: tapToPayInProgress = payment.posTapToPay && payment.posTapToPay.expiresAt > new Date();
	$: toPay = payment.currencySnapshot.main.price.amount;
	$: changeAmount = Math.max(0, (paidAmount ?? 0) - toPay);
	$: isInsufficientPayment = paidAmount !== null && paidAmount < toPay;
	$: isPosNonCash = payment.method === 'point-of-sale' && payment.posSubtype !== 'cash';
	$: showCashbackButton =
		posMode && payment.method === 'point-of-sale' && payment.status === 'pending';
	$: posSubtype =
		payment.method === 'point-of-sale' && payment.posSubtype
			? posSubtypes?.find((s) => s.slug === payment.posSubtype)
			: null;
	$: detailRequired = posSubtype?.paymentDetailRequired ?? false;

	$: showProforma = payment.status !== 'paid';
	$: showInvoice = payment.status === 'paid' && payment.invoice?.number;

	function confirmCancel(event: Event) {
		if (!confirm(t('order.confirmCancel'))) {
			event.preventDefault();
		}
	}
</script>

<!-- Receipt buttons -->
<div class="receipt-buttons flex flex-col gap-1">
	{#if showProforma && roleIsStaff}
		<button
			class="body-hyperlink self-start"
			type="button"
			disabled={!receiptReady}
			on:click={printReceipt}
		>
			{posMode ? t('pos.receipt.invoice') : 'Print receipt (A4)'}
		</button>
		<button
			class="body-hyperlink self-start"
			type="button"
			disabled={!ticketReady}
			on:click={printTicket}
		>
			{posMode ? t('pos.receipt.ticket') : 'Print receipt (ticket)'}
		</button>
	{/if}

	{#if showProforma && !roleIsStaff}
		<button
			class="body-hyperlink self-start"
			type="button"
			disabled={!receiptReady}
			on:click={printReceipt}
		>
			{t('order.receipt.createProforma')}
		</button>
	{/if}

	{#if showInvoice && roleIsStaff}
		<button
			class="btn btn-black self-start"
			type="button"
			disabled={!receiptReady}
			on:click={printReceipt}
		>
			{posMode ? t('pos.receipt.invoice') : 'Print receipt (A4)'}
		</button>
		<button
			class="btn btn-black self-start"
			type="button"
			disabled={!ticketReady}
			on:click={printTicket}
		>
			{posMode ? t('pos.receipt.ticket') : 'Print receipt (ticket)'}
		</button>
	{/if}

	{#if showInvoice && !roleIsStaff}
		<button
			class="btn btn-black self-start"
			type="button"
			disabled={!receiptReady}
			on:click={printReceipt}
		>
			{t('order.receipt.create')}
		</button>
	{/if}
</div>

<!-- Other actions (Cancel, Confirm, Replace, etc) -->
<div class="other-actions flex flex-col gap-2">
	<!-- Failed payment - customer re-attempt -->
	{#if payment.status === 'failed' && !roleIsStaff}
		<p class="text-red-500">{t('order.paymentCBFailed')}</p>
		<PaymentForm
			action="/order/{orderId}/payment/{payment.id}?/replaceMethod"
			mode="replace"
			{payment}
			{paymentMethods}
			{posSubtypes}
			{posMode}
		/>
	{/if}

	<!-- Pending payment - staff actions -->
	{#if payment.status === 'pending' && roleIsStaff}
		{#if tapToPayInProgress}
			<!-- Tap to Pay in progress -->
			<form
				action="{orderStaffActionBaseUrl}/payment/{payment.id}?/cancelTapToPay"
				method="post"
				class="flex flex-col gap-2"
			>
				<button type="submit" class="btn btn-green" disabled>
					{posMode ? t('pos.btn.tapToPay') : 'Tap to pay'}
				</button>
				<p>{t('pos.tapToPay.inProgress')}</p>
				<Spinner class="w-36" />
			</form>
		{:else}
			<!-- Hidden form targets -->
			<form
				action="{orderStaffActionBaseUrl}/payment/{payment.id}?/cancel"
				method="post"
				id="cancelForm-{payment.id}"
			></form>
			<form
				action="{orderStaffActionBaseUrl}/payment/{payment.id}?/tapToPay"
				method="post"
				id="tapToPayForm-{payment.id}"
			></form>

			<!-- Main confirmation form -->
			<form
				action="{orderStaffActionBaseUrl}/payment/{payment.id}?/confirm"
				method="post"
				class="flex flex-wrap gap-2"
				id="confirmForm-{payment.id}"
			>
				<!-- Bank transfer input -->
				{#if payment.method === 'bank-transfer'}
					<input
						class="form-input w-auto"
						type="text"
						name="bankTransferNumber"
						required
						placeholder={posMode ? t('pos.input.txNumber') : 'Bank transfer number'}
					/>
				{/if}

				<!-- POS detail input -->
				{#if payment.method === 'point-of-sale'}
					<input
						class="form-input grow mx-2"
						type="text"
						name="detail"
						required={detailRequired}
						placeholder={posMode
							? t('pos.input.detail')
							: 'Detail (card transaction ID, or point-of-sale payment method)'}
					/>
				{/if}
			</form>

			<!-- Hidden cashback input for form submission (non-cash only, positive change) -->
			{#if showCashbackButton && isPosNonCash && changeAmount > 0}
				<input
					type="hidden"
					name="cashbackAmount"
					value={changeAmount}
					form="confirmForm-{payment.id}"
				/>
				<input
					type="hidden"
					name="cashbackCurrency"
					value={payment.price.currency}
					form="confirmForm-{payment.id}"
				/>
			{/if}

			<!-- Unified button container (POS mode = grid, normal = flex) -->
			<div class="flex flex-wrap gap-2 unified-buttons">
				<!-- Cancel button -->
				<button
					type="submit"
					class="btn btn-red"
					form="cancelForm-{payment.id}"
					on:click={confirmCancel}
				>
					{t(posMode ? 'pos.btn.cancel' : 'pos.cta.cancelOrder')}
				</button>

				<!-- Mark paid button (POS + bank-transfer only) -->
				{#if payment.method === 'point-of-sale' || payment.method === 'bank-transfer'}
					<button
						type="submit"
						class="btn btn-black"
						form="confirmForm-{payment.id}"
						disabled={isInsufficientPayment}
					>
						{t(posMode ? 'pos.btn.paid' : 'pos.cta.markOrderPaid')}
					</button>
				{/if}

				<!-- Tap to Pay button (POS only) -->
				{#if payment.method === 'point-of-sale'}
					{#if tapToPayInUseByOtherOrder}
						<p class="text-red-500 w-full">{t('pos.tapToPay.inUseByOtherOrder')}</p>
					{:else if tapToPayConfigured && payment.posSubtypeHasProcessor}
						<button type="submit" form="tapToPayForm-{payment.id}" class="btn btn-green">
							{posMode ? t('pos.btn.tapToPay') : 'Tap to pay'}
						</button>
					{/if}
				{/if}

				<!-- Change/Replace button -->
				<button
					type="button"
					class="btn {openPaymentMethodChange ? 'btn-gray' : 'btn-blue'}"
					on:click={() => (openPaymentMethodChange = !openPaymentMethodChange)}
				>
					{openPaymentMethodChange
						? t('pos.cta.cancelReplacement')
						: t(posMode ? 'pos.btn.replace' : 'pos.cta.replacePayment')}
				</button>

				<!-- Cashback button (POS mode only) -->
				{#if showCashbackButton}
					<button
						type="button"
						class="btn {openCashbackSection ? 'btn-gray' : 'btn-blue'}"
						on:click={() => {
							openCashbackSection = !openCashbackSection;
							if (!openCashbackSection) {
								paidAmount = null;
							}
						}}
					>
						{openCashbackSection ? t('pos.cashback.cancel') : t('pos.cashback.title')}
					</button>
				{/if}
			</div>

			<!-- Expanded payment form -->
			{#if openPaymentMethodChange}
				<PaymentForm
					action="/order/{orderId}/payment/{payment.id}?/replaceMethod"
					mode="replace"
					{payment}
					{paymentMethods}
					{posSubtypes}
					{posMode}
				/>
			{/if}

			<!-- Expanded cashback section -->
			{#if openCashbackSection}
				<div class="cashback-section border rounded-lg p-4 bg-gray-50">
					<div class="grid gap-3">
						<!-- A payer (To pay) - read only -->
						<div>
							<label for="toPay-{payment.id}" class="block text-sm text-gray-600 mb-1"
								>{t('pos.cashback.toPay')}</label
							>
							<input
								type="text"
								readonly
								id="toPay-{payment.id}"
								value={toPay.toFixed(2)}
								class="form-input w-full bg-gray-100"
							/>
						</div>

						<!-- Payé (Paid) - editable -->
						<div>
							<label for="paidAmount-{payment.id}" class="block text-sm text-gray-600 mb-1">
								{t('pos.cashback.paid')}
							</label>
							<input
								type="number"
								step="0.01"
								min="0"
								id="paidAmount-{payment.id}"
								bind:value={paidAmount}
								class="form-input w-full"
								class:border-red-500={isInsufficientPayment}
								class:bg-red-50={isInsufficientPayment}
								placeholder={toPay.toFixed(2)}
							/>
						</div>

						<!-- A rendre (Change) - calculated -->
						<div>
							<label for="changeAmount-{payment.id}" class="block text-sm text-gray-600 mb-1"
								>{t('pos.cashback.change')}</label
							>
							<input
								type="text"
								readonly
								id="changeAmount-{payment.id}"
								value={changeAmount.toFixed(2)}
								class="form-input w-full"
								class:bg-red-50={isInsufficientPayment}
								class:text-red-600={isInsufficientPayment}
								class:bg-green-50={changeAmount > 0}
								class:text-green-600={changeAmount > 0}
							/>
						</div>

						<!-- Validate button -->
						<button
							type="button"
							class="btn btn-blue w-full mt-2"
							on:click={() => (openCashbackSection = false)}
						>
							{t('pos.cashback.validate')}
						</button>
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Paid payment detail editor (staff only, POS + bank-transfer) -->
	{#if payment.status === 'paid' && roleIsStaff && (payment.method === 'point-of-sale' || payment.method === 'bank-transfer')}
		<form
			action="{orderStaffActionBaseUrl}/payment/{payment.id}?/updatePaymentDetail"
			method="post"
			class="flex flex-wrap gap-2 items-center"
		>
			<input
				class="form-input"
				type="text"
				name="paymentDetail"
				value={payment.method === 'bank-transfer'
					? payment.bankTransferNumber ?? ''
					: payment.detail ?? ''}
				disabled={disableInfoChange}
			/>
			<button type="submit" class="btn btn-blue" disabled={disableInfoChange}>
				{t('pos.cta.updatePaymentInfo')}
			</button>
			<label class="flex items-center gap-1">
				<input type="checkbox" bind:checked={disableInfoChange} />
				🔐
			</label>
		</form>
	{/if}
</div>

<style>
	/* Grid layout for buttons ONLY in POS mode */
	:global(.pos-mode) .unified-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
</style>
