<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { navigating, page } from '$app/stores';
	import { onMount } from 'svelte';
	import OrderSummary from '$lib/components/OrderSummary.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import Picture from '$lib/components/Picture.svelte';
	import OrderLabelComponent from '$lib/components/OrderLabelComponent.svelte';
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import IconDownloadWindow from '$lib/components/icons/IconDownloadWindow.svelte';
	import IconExternalNewWindowOpen from '$lib/components/icons/IconExternalNewWindowOpen.svelte';
	import PaymentItem from '$lib/components/Order/PaymentItem.svelte';
	import PaymentActions from '$lib/components/Order/PaymentActions.svelte';
	import PaymentForm from '$lib/components/Order/PaymentForm.svelte';
	import { useI18n } from '$lib/i18n';
	import { FAKE_ORDER_INVOICE_NUMBER, orderAmountWithNoPaymentsCreated } from '$lib/types/Order';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { CUSTOMER_ROLE_ID } from '$lib/types/User.js';

	export let data;

	let count = 0;

	onMount(() => {
		const interval = setInterval(() => {
			if ($navigating) {
				return;
			}

			if (
				data.order.status === 'pending' ||
				data.order.payments.some((p) => p.invoice?.number === FAKE_ORDER_INVOICE_NUMBER)
			) {
				count++;
				if (count % 4 === 0) {
					invalidate(UrlDependency.Order);
				}
			}
		}, 1000);
		return () => clearInterval(interval);
	});

	const { t, locale, textAddress } = useI18n();

	let receiptIFrame: Record<string, HTMLIFrameElement | null> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, null])
	);
	let receiptReady: Record<string, boolean> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, false])
	);
	let ticketIFrame: Record<string, HTMLIFrameElement | null> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, null])
	);
	let ticketReady: Record<string, boolean> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, false])
	);
	let ticketsIframe: HTMLIFrameElement | null = null;
	let ticketsReady = false;

	$: remainingAmount = orderAmountWithNoPaymentsCreated(data.order, {
		ignorePendingPayments: true
	});
	$: lastPayment = data.order.payments[data.order.payments.length - 1];
	$: showContinue = !(lastPayment?.status === 'pending' && lastPayment?.method === 'point-of-sale');
	$: skipMode = lastPayment?.status === 'pending' && lastPayment?.method !== 'point-of-sale';

	function confirmCancelOrder(event: Event) {
		if (!confirm(t('pos.cancelOrderMessage'))) {
			event.preventDefault();
		}
	}

	let tickets = data.order.items.flatMap((item) => item.tickets ?? []);
	let ticketNumbers = Object.fromEntries(tickets.map((ticket, i) => [ticket, i + 1]));
	$: labelById = data.labels
		? Object.fromEntries(data.labels.map((label) => [label._id, label]))
		: undefined;

	const roleIsStaff = !!data.roleId && data.roleId !== CUSTOMER_ROLE_ID;
	const orderStaffActionBaseUrl = data.posMode
		? `/pos/order/${data.order._id}`
		: `/admin/order/${data.order._id}`;
</script>

<main class="mx-auto max-w-7xl py-10 px-6 body-mainPlan" class:pos-mode={data.posMode}>
	<!-- ==================== CMS TOP SECTION ==================== -->
	<div class="cms-section-top">
		{#if data.cmsOrderTop && data.cmsOrderTopData}
			<CmsDesign
				challenges={data.cmsOrderTopData.challenges}
				tokens={data.cmsOrderTopData.tokens}
				sliders={data.cmsOrderTopData.sliders}
				products={data.cmsOrderTopData.products}
				pictures={data.cmsOrderTopData.pictures}
				tags={data.cmsOrderTopData.tags}
				digitalFiles={data.cmsOrderTopData.digitalFiles}
				hasPosOptions={data.hasPosOptions}
				specifications={data.cmsOrderTopData.specifications}
				contactForms={data.cmsOrderTopData.contactForms}
				pageName={data.cmsOrderTop.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				countdowns={data.cmsOrderTopData.countdowns}
				galleries={data.cmsOrderTopData.galleries}
				leaderboards={data.cmsOrderTopData.leaderboards}
				schedules={data.cmsOrderTopData.schedules}
				class={data.hideCmsZonesOnMobile
					? 'prose max-w-full hidden lg:contents'
					: 'prose max-w-full'}
			/>
		{/if}
	</div>

	<!-- ==================== MAIN CONTAINER ==================== -->
	<div
		class="w-full rounded-xl body-mainPlan border-gray-300 lg:p-6 p-2 lg:grid lg:grid-cols-3 sm:flex-wrap gap-2 flex-col-reverse"
	>
		<!-- Back to cart link (only in headless display mode) -->
		<div
			class="flex justify-start {$page.url.searchParams.get('display') === 'headless'
				? ''
				: 'hidden'}"
		>
			<a href="/pos/touch" class="body-hyperlink hover:underline">
				&lt;&lt;{t('checkout.backToCart')}
			</a>
		</div>

		<!-- ==================== LEFT COLUMN  ==================== -->
		<div class="col-span-2 flex flex-col gap-2">
			<h1 class="text-3xl body-title">
				{t('order.singleTitle', { number: data.order.number })}
			</h1>

			{#if roleIsStaff}
				<div class="order-labels flex flex-row gap-1">
					{#if data.order.orderLabelIds?.length && labelById}
						{#each data.order.orderLabelIds as labelId}
							<OrderLabelComponent orderLabel={labelById[labelId]} class="text-xs" />
						{/each}
					{/if}
					<a
						href="/admin/order/{data.order._id}/label"
						class="bg-gray-200 px-2 rounded-full"
						title="add label"
					>
						+
					</a>
				</div>
			{/if}

			{#if data.order.notifications?.paymentStatus?.npub}
				<p>
					{t('order.paymentStatusNpub')}:
					<span class="font-mono break-all break-words body-secondaryText">
						{data.order.notifications.paymentStatus.npub}
					</span>
				</p>
			{/if}

			{#if data.order.status !== 'expired' && data.order.status !== 'canceled'}
				<div class="order-link">
					<Trans key="order.linkReminder">
						<a
							class="underline body-hyperlink break-all break-words body-secondaryText"
							href={$page.url.href}
							slot="0"
						>
							{$page.url.href}
						</a>
					</Trans>
				</div>
			{/if}

			<!-- ========== POS MODE: Receipt buttons above payment details ========== -->
			{#if data.posMode && data.order.payments.length > 0}
				{@const lastPayment = data.order.payments[data.order.payments.length - 1]}
				{#if lastPayment.status === 'paid' || (lastPayment.invoice?.number && lastPayment.invoice.number !== FAKE_ORDER_INVOICE_NUMBER)}
					<div class="pos-receipt-buttons flex flex-row gap-1">
						<button
							class="btn btn-black flex-1 text-base px-3 py-2 whitespace-nowrap"
							type="button"
							disabled={!ticketReady[lastPayment.id]}
							on:click={() => ticketIFrame[lastPayment.id]?.contentWindow?.print()}
						>
							{t('pos.receipt.ticket')}
						</button>
						<button
							class="btn btn-black flex-1 text-base px-3 py-2 whitespace-nowrap"
							type="button"
							disabled={!receiptReady[lastPayment.id]}
							on:click={() => receiptIFrame[lastPayment.id]?.contentWindow?.print()}
						>
							{t('pos.receipt.invoice')}
						</button>
					</div>
				{/if}
			{/if}

			<!-- ========== PAYMENTS SECTION ========== -->
			<div class="payments-section">
				{#each data.order.payments as payment}
					<PaymentItem
						{payment}
						orderId={data.order._id}
						posMode={data.posMode}
						hideCreditCardQrCode={data.hideCreditCardQrCode}
						sellerIdentity={data.sellerIdentity}
						posSubtypes={data.posSubtypes}
						returnTo={data.returnTo}
					>
						<PaymentActions
							{payment}
							orderId={data.order._id}
							{orderStaffActionBaseUrl}
							{roleIsStaff}
							paymentMethods={data.paymentMethods}
							posSubtypes={data.posSubtypes}
							posMode={data.posMode}
							tapToPayConfigured={data.tapToPay.configured}
							tapToPayInUseByOtherOrder={data.tapToPay.inUseByOtherOrder}
							printReceipt={() => receiptIFrame[payment.id]?.contentWindow?.print()}
							printTicket={() => ticketIFrame[payment.id]?.contentWindow?.print()}
							receiptReady={receiptReady[payment.id]}
							ticketReady={ticketReady[payment.id]}
						/>
					</PaymentItem>

					<!-- Hidden iframes for receipt/invoice printing -->
					{#if payment.status !== 'paid' || (payment.invoice?.number && payment.invoice.number !== FAKE_ORDER_INVOICE_NUMBER)}
						<iframe
							src="/order/{data.order._id}/payment/{payment.id}/receipt"
							style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
							title=""
							on:load={() => (receiptReady = { ...receiptReady, [payment.id]: true })}
							bind:this={receiptIFrame[payment.id]}
						/>
						{#if roleIsStaff}
							<iframe
								src="/order/{data.order._id}/payment/{payment.id}/ticket"
								style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
								title=""
								on:load={() => (ticketReady = { ...ticketReady, [payment.id]: true })}
								bind:this={ticketIFrame[payment.id]}
							/>
						{/if}
					{/if}
				{/each}
			</div>

			<!-- ========== ORDER STATUS MESSAGE ========== -->
			<div class="order-status-message">
				{#if data.order.status === 'paid'}
					<p>
						<Trans key="order.paymentStatus.paidTemplate">
							<span class="text-green-500" let:translation slot="0">{translation}</span>
						</Trans>
					</p>
				{:else if data.order.status === 'expired'}
					<p>{t('order.paymentStatus.expiredTemplate')}</p>
				{:else if data.order.status === 'canceled'}
					<p class="font-bold">{t('order.paymentStatus.canceledTemplate')}</p>
				{/if}
			</div>

			<!-- ========== TICKETS SECTION ========== -->
			{#if data.order.items.some((item) => item.tickets?.length)}
				<h2 class="text-2xl">{t('order.tickets.title')}</h2>

				<iframe
					src="/order/{data.order._id}/tickets"
					style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
					title=""
					on:load={() => (ticketsReady = true)}
					bind:this={ticketsIframe}
				/>

				<p>
					<button
						class="body-hyperlink self-start"
						disabled={!ticketsReady}
						on:click={() => ticketsIframe?.contentWindow?.print()}
					>
						{t('order.tickets.printAll')}
					</button>
					-
					<a href="/order/{data.order._id}/tickets" class="body-hyperlink hover:underline">
						{t('order.tickets.seeAll')}
					</a>
				</p>

				{#each data.order.items as item}
					{#if item.tickets?.length}
						<h3 class="text-xl flex items-center gap-2">
							<a class="contents" href="/product/{item.product._id}">
								{#if item.picture}
									<Picture picture={item.picture} class="w-6 h-6 object-cover rounded" />
								{/if}
								{item.product.name}
							</a>
						</h3>

						{#each item.tickets as ticket}
							<a href="/ticket/{ticket}" class="body-hyperlink hover:underline">
								{t('order.tickets.ticket', { number: ticketNumbers[ticket] })}
							</a>
						{/each}
					{/if}
				{/each}
			{/if}

			<!-- ========== DIGITAL FILES SECTION ========== -->
			{#if data.digitalFiles.length}
				<h2 class="text-2xl">{t('product.digitalFiles.title')}</h2>
				<ul>
					{#each data.digitalFiles as digitalFile}
						<li class="flex flex-row gap-2">
							<IconDownloadWindow class="mt-1 body-hyperlink" />
							{#if digitalFile.link}
								<a href={digitalFile.link} class="body-hyperlink hover:underline" target="_blank">
									{digitalFile.name}
								</a>
							{:else}
								{digitalFile.name}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<!-- ========== EXTERNAL RESOURCES SECTION ========== -->
			{#if data.order.items.flatMap((item) => item.product.externalResources || []).length}
				<h2 class="text-2xl">{t('order.externalResources.title')}</h2>
				<ul>
					{#each data.order.items.flatMap((item) => item.product.externalResources || []) as externalResource}
						<li class="flex flex-row gap-2">
							<IconExternalNewWindowOpen class="mt-1 body-hyperlink" />
							{#if externalResource?.href}
								<a
									href={externalResource?.href}
									class="body-hyperlink hover:underline"
									target="_blank"
								>
									{externalResource?.label}
								</a>
							{:else}
								{externalResource?.label}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<!-- ========== ADDITIONAL INFO ========== -->

			{#if data.order.vatFree}
				<p>{t('order.vatFree', { reason: data.order.vatFree.reason })}</p>
			{/if}

			<p class="order-created-date text-base">
				<Trans key="order.createdAt">
					<time
						datetime={data.order.createdAt.toJSON()}
						title={data.order.createdAt.toLocaleString($locale)}
						slot="0"
					>
						{data.order.createdAt.toLocaleString($locale)}
					</time>
				</Trans>
			</p>

			{#if data.order.shippingAddress}
				<div>
					{t('order.shippingAddress.title')}:
					<p class="body-secondaryText whitespace-pre-line">
						{textAddress(data.order.shippingAddress)}
					</p>
				</div>
			{/if}

			{#if data.order.user}
				<div class="contact-address">
					{t('order.contactAddress.title')}:
					{#if data.order.user.email}
						<p class="body-secondaryText whitespace-pre-line">
							{data.order.user.email}
						</p>
					{/if}
					{#if data.order.user.npub}
						<p class="body-secondaryText whitespace-pre-line break-words break-all">
							{data.order.user.npub}
						</p>
					{/if}
					<br />
					{#if roleIsStaff}
						{t('order.seller.title')}:
						<p class="body-secondaryText whitespace-pre-line break-words break-all">
							{data.order.user.userAlias ?? 'System'}
						</p>
					{/if}
				</div>
			{/if}

			<!-- ========== ADD PAYMENT SECTION (Staff Only) ========== -->
			{#if data.order.status === 'pending' && remainingAmount && roleIsStaff}
				<div class="border border-gray-300 rounded-xl p-4 add-payment-section">
					<h3 class="text-xl mb-2">{t('order.addPayment.title')}</h3>

					<PaymentForm
						action="{orderStaffActionBaseUrl}?/addPayment"
						mode="add"
						paymentMethods={data.paymentMethods}
						posSubtypes={data.posSubtypes}
						maxAmount={remainingAmount}
						posMode={data.posMode}
					/>

					<form action="{orderStaffActionBaseUrl}?/cancel" method="post" id="cancelOrderForm">
						<button type="submit" class="btn btn-red mt-2" on:click={confirmCancelOrder}>
							{t('pos.cta.cancelMultiPayOrder')}
						</button>
					</form>
				</div>
			{/if}

			<!-- ========== STAFF ONLY SECTION ========== -->
			{#if roleIsStaff}
				{#if data.order.payments.length > 1 && data.order.status !== 'expired' && data.order.status !== 'canceled'}
					<div class="multi-payment-receipt">
						{#if data.order.status === 'paid'}
							<a
								class="btn bg-green-600 text-white self-start"
								href="/order/{data.order._id}/summary"
							>
								{t('order.receiptFullyPaid')}
							</a>
						{:else}
							<a class="btn btn-blue self-start" href="/order/{data.order._id}/summary">
								{t('order.receiptPending')}
							</a>
						{/if}
					</div>
				{/if}

				<!-- POS MODE: "Continue" - only show when last payment is paid -->
				{#if data.posMode && data.order.orderTabSlug && showContinue}
					<a
						href={data.splitMode
							? `/pos/touch/tab/${data.order.orderTabSlug}/split?mode=${data.splitMode}`
							: `/pos/touch/tab/${data.order.orderTabSlug}`}
						class="btn btn-black w-full text-center text-2xl py-4"
					>
						{skipMode
							? t('pos.split.skipForNow')
							: data.splitMode
							? t('pos.split.continueSplit')
							: t('pos.split.return')}
					</a>
				{/if}

				<!-- POS MODE: Notes  -->
				{#if data.posMode}
					<details class="pos-notes-details rounded border border-gray-300 p-4">
						<summary class="cursor-pointer text-xl">
							{t('pos.staffNotes')}
						</summary>
						<form action="{orderStaffActionBaseUrl}?/saveNote" method="post" class="contents">
							<section class="gap-4 flex flex-col mt-4">
								<article class="rounded border border-gray-300 overflow-hidden flex flex-col">
									<div class="p-4 flex flex-col gap-3">
										<label class="form-label text-2xl">
											{t('order.note.label')}
											<textarea name="noteContent" cols="30" rows="2" class="form-input" />
										</label>
									</div>
								</article>

								<button type="submit" class="btn w-full btn-blue">
									{t('order.note.saveText')}
								</button>
							</section>
						</form>

						<!-- Existing notes  -->
						{#if data.order.notes.length > 0}
							<div class="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-200">
								{#each [...data.order.notes].reverse() as note}
									<div class="text-sm">
										<div class="text-gray-600">
											{note.isSystem
												? t('order.note.authorSystem')
												: note.isEmployee
												? t('order.note.author', { alias: note.alias })
												: t('order.note.authorCustomer')}
											<span class="ml-2">{note.createdAt.toLocaleString($locale)}</span>
										</div>
										<div class="mt-1 p-2 bg-gray-50 rounded">{note.content}</div>
									</div>
								{/each}
							</div>
						{/if}
					</details>
				{:else}
					<!-- Non-POS mode: original notes layout -->
					<form action="{orderStaffActionBaseUrl}?/saveNote" method="post" class="contents">
						<section class="gap-4 flex flex-col">
							<article class="rounded border border-gray-300 overflow-hidden flex flex-col">
								<div class="p-4 flex flex-col gap-3">
									<label class="form-label text-2xl">
										{t('order.note.label')}
										<textarea name="noteContent" cols="30" rows="2" class="form-input" />
									</label>
								</div>
							</article>

							<div class="flex flex-wrap gap-3 justify-between">
								<button type="submit" class="btn lg:w-auto w-full btn-blue self-start">
									{t('order.note.saveText')}
								</button>
								<a
									href="/order/{data.order._id}/notes"
									class="btn lg:w-auto w-full btn-gray self-end"
								>
									{t('order.note.seeText')}
								</a>
								{#if data.order.orderTabSlug}
									{#if data.splitMode && showContinue}
										<a
											href="/pos/touch/tab/{data.order.orderTabSlug}/split?mode={data.splitMode}"
											class="btn lg:w-auto w-full btn-black self-end"
										>
											{skipMode ? t('pos.split.skipForNow') : t('pos.split.continueSplit')}
										</a>
									{/if}
									<a
										href="/pos/touch/tab/{data.order.orderTabSlug}"
										class="btn lg:w-auto w-full btn-gray self-end"
									>
										@@Back to order tab
									</a>
								{/if}
							</div>
						</section>
					</form>
				{/if}
			{/if}
		</div>
		<!-- END: LEFT COLUMN -->

		<!-- ==================== RIGHT COLUMN (1/3 width) ==================== -->
		<div class="mt-6">
			<OrderSummary class="sticky top-4 -mr-2 -mt-2" order={data.order} />
		</div>
	</div>
	<!-- END: MAIN CONTAINER -->

	<!-- ==================== CMS BOTTOM SECTION ==================== -->
	<div class="cms-section-bottom">
		{#if data.cmsOrderBottom && data.cmsOrderBottomData}
			<CmsDesign
				challenges={data.cmsOrderBottomData.challenges}
				tokens={data.cmsOrderBottomData.tokens}
				sliders={data.cmsOrderBottomData.sliders}
				products={data.cmsOrderBottomData.products}
				pictures={data.cmsOrderBottomData.pictures}
				tags={data.cmsOrderBottomData.tags}
				digitalFiles={data.cmsOrderBottomData.digitalFiles}
				hasPosOptions={data.hasPosOptions}
				specifications={data.cmsOrderBottomData.specifications}
				contactForms={data.cmsOrderBottomData.contactForms}
				pageName={data.cmsOrderBottom.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				countdowns={data.cmsOrderBottomData.countdowns}
				galleries={data.cmsOrderBottomData.galleries}
				leaderboards={data.cmsOrderBottomData.leaderboards}
				schedules={data.cmsOrderBottomData.schedules}
				class={data.hideCmsZonesOnMobile
					? 'prose max-w-full hidden lg:contents'
					: 'prose max-w-full'}
			/>
		{/if}
	</div>
</main>

<style>
	/* ==================== POS MODE STYLES ==================== */
	/* Applied when data.posMode = true (adds .pos-mode class to main) */

	/* Hide non-essential elements in POS mode */
	:global(.pos-mode .cms-section-top),
	:global(.pos-mode .cms-section-bottom),
	:global(.pos-mode .order-labels),
	:global(.pos-mode .order-link),
	:global(.pos-mode .order-status-message),
	:global(.pos-mode .payment-details-list),
	:global(.pos-mode .payment-instruction),
	:global(.pos-mode .order-created-date),
	:global(.pos-mode .contact-address),
	:global(.pos-mode .mt-6),
	:global(.pos-mode .multi-payment-receipt),
	:global(.pos-mode .add-payment-section),
	:global(.pos-mode .receipt-buttons) {
		display: none !important;
	}

	/* Show only last payment in split payments (POS) */
	:global(.pos-mode .payment-item:not(:last-of-type)) {
		display: none !important;
	}

	:global(.pos-mode) {
		padding-top: 1rem;
		padding-bottom: 1.5rem;
	}

	:global(.pos-grid) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
</style>
