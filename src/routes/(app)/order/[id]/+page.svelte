<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import OrderSummary from '$lib/components/OrderSummary.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import IconCopy from '~icons/ant-design/copy-outlined';
	import IconCheckmark from '~icons/ant-design/check-outlined';
	import { useI18n } from '$lib/i18n';
	import {
		bitcoinPaymentQrCodeString,
		FAKE_ORDER_INVOICE_NUMBER,
		lightningPaymentQrCodeString,
		orderAmountWithNoPaymentsCreated
	} from '$lib/types/Order';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User.js';
	import { differenceInMinutes } from 'date-fns';
	import { onMount } from 'svelte';
	import IconSumupWide from '$lib/components/icons/IconSumupWide.svelte';
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import Picture from '$lib/components/Picture.svelte';
	import IconStripe from '$lib/components/icons/IconStripe.svelte';
	import IconDownloadWindow from '$lib/components/icons/IconDownloadWindow.svelte';
	import IconExternalNewWindowOpen from '$lib/components/icons/IconExternalNewWindowOpen.svelte';

	let currentDate = new Date();
	export let data;

	let count = 0;
	let copiedPaymentAddress = -1;

	onMount(() => {
		const interval = setInterval(() => {
			currentDate = new Date();

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
	let ticketIframe: HTMLIFrameElement | null = null;
	let ticketReady = false;

	$: remainingAmount = orderAmountWithNoPaymentsCreated(data.order);
	let disableInfoChange = true;
	function confirmCancel(event: Event) {
		if (!confirm(t('order.confirmCancel'))) {
			event.preventDefault();
		}
	}

	let tickets = data.order.items.flatMap((item) => item.tickets ?? []);
	let ticketNumbers = Object.fromEntries(tickets.map((ticket, i) => [ticket, i + 1]));
</script>

<main class="mx-auto max-w-7xl py-10 px-6 body-mainPlan">
	{#if data.cmsOrderTop && data.cmsOrderTopData}
		<CmsDesign
			challenges={data.cmsOrderTopData.challenges}
			tokens={data.cmsOrderTopData.tokens}
			sliders={data.cmsOrderTopData.sliders}
			products={data.cmsOrderTopData.products}
			pictures={data.cmsOrderTopData.pictures}
			tags={data.cmsOrderTopData.tags}
			digitalFiles={data.cmsOrderTopData.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.cmsOrderTopData.specifications}
			contactForms={data.cmsOrderTopData.contactForms}
			pageName={data.cmsOrderTop.title}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.cmsOrderTopData.countdowns}
			galleries={data.cmsOrderTopData.galleries}
			leaderboards={data.cmsOrderTopData.leaderboards}
			class={data.hideCmsZonesOnMobile ? 'hidden lg:contents' : ''}
		/>
	{/if}
	<div
		class="w-full rounded-xl body-mainPlan border-gray-300 lg:p-6 p-2 lg:grid lg:grid-cols-3 sm:flex-wrap gap-2 flex-col-reverse"
	>
		<div
			class="flex justify-start {$page.url.searchParams.get('display') === 'headless'
				? ''
				: 'hidden'}"
		>
			<a href="/pos/touch" class="body-hyperlink hover:underline"
				>&lt;&lt;{t('checkout.backToCart')}</a
			>
		</div>
		<div class="col-span-2 flex flex-col gap-2">
			<h1 class="text-3xl body-title">{t('order.singleTitle', { number: data.order.number })}</h1>
			{#if data.order.notifications?.paymentStatus?.npub}
				<p>
					{t('order.paymentStatusNpub')}:
					<span class="font-mono break-all break-words body-secondaryText">
						{data.order.notifications.paymentStatus.npub}</span
					>
				</p>
			{/if}
			{#if data.order.status !== 'expired' && data.order.status !== 'canceled'}
				<div>
					<Trans key="order.linkReminder"
						><a
							class="underline body-hyperlink break-all break-words body-secondaryText"
							href={$page.url.href}
							slot="0">{$page.url.href}</a
						></Trans
					>
				</div>
			{/if}

			{#each data.order.payments as payment, i}
				<details class="border border-gray-300 rounded-xl p-4" open={payment.status === 'pending'}>
					<summary class="lg:text-xl cursor-pointer">
						<!-- Extra span to keep the "arrow" for the details -->
						<span class="items-center inline-flex gap-2"
							>{t(`checkout.paymentMethod.${payment.method}`)} - <PriceTag
								inline
								class="break-words {payment.status === 'paid'
									? 'text-green-500'
									: 'body-secondaryText'} "
								amount={payment.price.amount}
								currency={payment.price.currency}
							/> - {t(`order.paymentStatus.${payment.status}`)}</span
						>
					</summary>
					<div class="flex flex-col gap-2 mt-2">
						{#if payment.method !== 'point-of-sale'}
							<ul>
								{#if payment.status === 'pending'}
									<li>
										{#if payment.method === 'card'}
											<a
												href="/order/{data.order._id}/payment/{payment.id}/pay"
												class="body-hyperlink"
											>
												<span>{t('order.paymentLink')}</span>
												{#if payment.processor === 'sumup'}
													<IconSumupWide
														class="h-12 {data.overwriteCreditCardSvgColor
															? 'order-creditCard-svg'
															: ''} "
													/>
												{:else if payment.processor === 'stripe'}
													<IconStripe class="h-12" />
												{:else if payment.processor === 'paypal'}
													<img
														src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_200x51.png"
														alt="PayPal"
														class="h-12"
													/>
												{/if}
											</a>
										{:else if payment.method === 'paypal'}
											<a
												href="/order/{data.order._id}/payment/{payment.id}/pay"
												class="body-hyperlink"
											>
												<span>{t('order.paymentLinkGeneric')}</span>
												<img
													src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_200x51.png"
													alt="PayPal"
													class="h-12"
												/>
											</a>
										{:else if payment.method === 'bank-transfer'}
											{#if data.sellerIdentity?.bank?.accountHolder}
												<p>
													{t('order.paymentAccountHolder')}:
													<span class="break-words body-secondaryText break-all">
														{data.sellerIdentity?.bank?.accountHolder}
													</span>
												</p>
											{/if}
											{#if data.sellerIdentity?.bank?.accountHolderAddress}
												<p>
													{t('order.paymentAccountHolderAddress')}:
													<span class="break-words body-secondaryText break-all">
														{data.sellerIdentity?.bank?.accountHolderAddress}
													</span>
												</p>
											{/if}
											<p>
												{t('order.paymentIban')}:
												<code class="break-words body-secondaryText break-all">
													{data.sellerIdentity?.bank?.iban.replace(/.{4}(?=.)/g, '$& ')}
												</code>
											</p>
											<p>
												{t('order.paymentBic')}:
												<code class="break-words body-secondaryText break-all">
													{data.sellerIdentity?.bank?.bic}
												</code>
											</p>
										{:else}
											{t('order.paymentAddress')}:
											<code class="break-words body-secondaryText break-all">{payment.address}</code
											>
											<button
												class="inline-block body-secondaryText"
												type="button"
												title={t('order.copyAddress')}
												on:click={() => {
													window.navigator.clipboard.writeText(payment.address ?? '');
													copiedPaymentAddress = i;
												}}
											>
												{#if copiedPaymentAddress === i}
													<IconCheckmark class="inline-block mb-1" />
													{t('general.copied')}
												{:else}
													<IconCopy class="inline-block mb-1" />
												{/if}
											</button>
										{/if}
									</li>
								{/if}
								{#if payment.expiresAt && payment.status === 'pending'}
									<li>
										{t('order.timeRemaining', {
											minutes: differenceInMinutes(payment.expiresAt, currentDate)
										})}
									</li>
								{/if}
								{#if payment.status === 'paid' && payment.paidAt}
									<li>
										{t('order.paymentPaidAt', {
											date: payment.paidAt.toLocaleDateString($locale)
										})}
									</li>
								{/if}
							</ul>
						{/if}

						{#if payment.status !== 'paid'}
							<button
								class="body-hyperlink self-start"
								type="button"
								disabled={!receiptReady[payment.id]}
								on:click={() => receiptIFrame[payment.id]?.contentWindow?.print()}
								>{t('order.receipt.createProforma')}</button
							>
							<iframe
								src="/order/{data.order._id}/payment/{payment.id}/receipt"
								style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
								title=""
								on:load={() => (receiptReady = { ...receiptReady, [payment.id]: true })}
								bind:this={receiptIFrame[payment.id]}
							/>
						{/if}
						{#if payment.status === 'paid' && payment.invoice?.number}
							<button
								class="btn btn-black self-start"
								type="button"
								disabled={!receiptReady[payment.id]}
								on:click={() => receiptIFrame[payment.id]?.contentWindow?.print()}
								>{t('order.receipt.create')}</button
							>
							{#if payment.invoice.number !== FAKE_ORDER_INVOICE_NUMBER}
								<iframe
									src="/order/{data.order._id}/payment/{payment.id}/receipt"
									style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
									title=""
									on:load={() => (receiptReady = { ...receiptReady, [payment.id]: true })}
									bind:this={receiptIFrame[payment.id]}
								/>
							{/if}
						{/if}

						{#if payment.status === 'pending'}
							{#if payment.method === 'lightning'}
								<a href={lightningPaymentQrCodeString(payment.address ?? '')}>
									<img
										src="{$page.url.pathname}/payment/{payment.id}/qrcode"
										class="w-96 h-96"
										alt="QR code"
									/></a
								>
							{/if}
							{#if payment.method === 'card' && !data.hideCreditCardQrCode}
								<img
									src="{$page.url.pathname}/payment/{payment.id}/qrcode"
									class="w-96 h-96"
									alt="QR code"
								/>
							{/if}
							{#if payment.method === 'bitcoin' && payment.address}
								<span class="body-hyperlink font-light italic">{t('order.clickQR')}</span>
								<a
									href={bitcoinPaymentQrCodeString(
										payment.address,
										payment.price.amount,
										payment.price.currency
									)}
								>
									<img
										src="{$page.url.pathname}/payment/{payment.id}/qrcode"
										class="w-96 h-96"
										alt="QR code"
									/>
								</a>
							{/if}
							{#if payment.method !== 'point-of-sale'}
								{t('order.payToComplete')}
							{/if}
							{#if payment.method === 'bitcoin'}
								{t('order.payToCompleteBitcoin', { count: payment.confirmationBlocksRequired })}
							{/if}

							{#if payment.method === 'bank-transfer'}
								{#if data.sellerIdentity?.contact.email}
									<a
										href="mailto:{data.sellerIdentity.contact.email}"
										class="btn btn-black self-start"
									>
										{t('order.informSeller')}
									</a>
								{/if}
							{/if}

							{#if data.roleId !== CUSTOMER_ROLE_ID && data.roleId}
								<form
									action="/{data.roleId === POS_ROLE_ID ? 'pos' : 'admin'}/order/{data.order
										._id}/payment/{payment.id}?/cancel"
									method="post"
									id="cancelForm"
								></form>
								<form
									action="/{data.roleId === POS_ROLE_ID ? 'pos' : 'admin'}/order/{data.order
										._id}/payment/{payment.id}?/confirm"
									method="post"
									class="flex flex-wrap gap-2"
								>
									{#if payment.method === 'bank-transfer'}
										<input
											class="form-input w-auto"
											type="text"
											name="bankTransferNumber"
											required
											placeholder="bank transfer number"
										/>
									{/if}
									{#if payment.method === 'point-of-sale'}
										<input
											class="form-input grow mx-2"
											type="text"
											name="detail"
											required
											placeholder="Detail (card transaction ID, or point-of-sale payment method)"
										/>
									{/if}

									<button
										type="submit"
										class="btn btn-red"
										on:click={confirmCancel}
										form="cancelForm"
									>
										{t('pos.cta.cancelOrder')}
									</button>
									{#if payment.method === 'point-of-sale' || payment.method === 'bank-transfer'}
										<button type="submit" class="btn btn-black">
											{t('pos.cta.markOrderPaid')}
										</button>
									{/if}
								</form>
							{/if}
						{/if}

						{#if (payment.method === 'point-of-sale' || payment.method === 'bank-transfer') && data.roleId !== CUSTOMER_ROLE_ID && data.roleId && payment.status === 'paid'}
							<form
								action="/{data.roleId === POS_ROLE_ID ? 'pos' : 'admin'}/order/{data.order
									._id}/payment/{payment.id}?/updatePaymentDetail"
								method="post"
								class="contents"
							>
								<input
									class="form-input w-auto"
									type="text"
									name="paymentDetail"
									disabled={disableInfoChange}
									placeholder="bank transfer number / Detail (card transaction ID, or point-of-sale payment method)"
									value={payment.bankTransferNumber ?? payment.detail}
									required
								/>
								<div class="flex gap-2">
									<button type="submit" class="btn btn-blue" disabled={disableInfoChange}
										>{t('pos.cta.updatePaymentInfo')}</button
									>
									<label class="checkbox-label">
										<input class="form-checkbox" type="checkbox" bind:checked={disableInfoChange} />
										🔐
									</label>
								</div>
							</form>
						{/if}
					</div>
				</details>
			{/each}

			{#if data.order.status === 'paid'}
				<p>
					<Trans key="order.paymentStatus.paidTemplate"
						><span class="text-green-500" let:translation slot="0">{translation}</span></Trans
					>
				</p>
			{:else if data.order.status === 'expired'}
				<p>{t('order.paymentStatus.expiredTemplate')}</p>
			{:else if data.order.status === 'canceled'}
				<p class="font-bold">{t('order.paymentStatus.canceledTemplate')}</p>
			{/if}

			{#if data.order.items.some((item) => item.tickets?.length)}
				<h2 class="text-2xl">{t('order.tickets.title')}</h2>

				<iframe
					src="/order/{data.order._id}/tickets"
					style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
					title=""
					on:load={() => (ticketReady = true)}
					bind:this={ticketIframe}
				/>

				<p>
					<button
						class="body-hyperlink self-start"
						disabled={!ticketReady}
						on:click={() => ticketIframe?.contentWindow?.print()}
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
			{#if data.digitalFiles.length}
				<h2 class="text-2xl">{t('product.digitalFiles.title')}</h2>
				<ul>
					{#each data.digitalFiles as digitalFile}
						<li class="flex flex-row gap-2">
							<IconDownloadWindow class="mt-1 body-hyperlink" />
							{#if digitalFile.link}
								<a href={digitalFile.link} class="body-hyperlink hover:underline" target="_blank"
									>{digitalFile.name}</a
								>
							{:else}
								{digitalFile.name}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
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
									target="_blank">{externalResource?.label}</a
								>
							{:else}
								{externalResource?.label}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if data.order.vatFree}
				<p>{t('order.vatFree', { reason: data.order.vatFree.reason })}</p>
			{/if}
			<p class="text-base">
				<Trans key="order.createdAt"
					><time
						datetime={data.order.createdAt.toJSON()}
						title={data.order.createdAt.toLocaleString($locale)}
						slot="0">{data.order.createdAt.toLocaleString($locale)}</time
					></Trans
				>
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
				<div>
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
				</div>
			{/if}

			{#if data.order.status === 'pending' && remainingAmount && data.roleId !== CUSTOMER_ROLE_ID && data.roleId}
				<form
					action="/{data.roleId === POS_ROLE_ID ? 'pos' : 'admin'}/order/{data.order
						._id}?/addPayment"
					method="post"
					class="contents"
				>
					<div class="flex flex-wrap gap-2">
						<label class="form-label">
							{t('order.addPayment.amount')}
							<input
								class="form-input"
								type="number"
								name="amount"
								min="0"
								step="any"
								max={remainingAmount}
								value={remainingAmount}
								required
							/>
						</label>
						<label class="form-label">
							{t('order.addPayment.currency')}
							<select name="currency" class="form-input" disabled>
								<option value={data.order.currencySnapshot.main.totalPrice.currency}
									>{data.order.currencySnapshot.main.totalPrice.currency}</option
								>
							</select>
						</label>
						<label class="form-label">
							<span>{t('checkout.payment.method')}</span>
							<select name="method" class="form-input">
								{#each data.paymentMethods as paymentMethod}
									<option value={paymentMethod}
										>{t(`checkout.paymentMethod.${paymentMethod}`)}</option
									>
								{/each}
							</select>
						</label><br />
						<button type="submit" class="btn btn-blue self-end">{t('order.addPayment.cta')}</button>
					</div>
				</form>
			{/if}

			{#if data.roleId !== CUSTOMER_ROLE_ID && data.roleId}
				{#if data.order.payments.length > 1 && data.order.status !== 'expired' && data.order.status !== 'canceled'}
					{#if data.order.status === 'paid'}
						<a class="btn bg-green-600 text-white self-start" href="/order/{data.order._id}/summary"
							>{t('order.receiptFullyPaid')}</a
						>
					{:else}
						<a class="btn btn-blue self-start" href="/order/{data.order._id}/summary"
							>{t('order.receiptPending')}</a
						>
					{/if}
				{/if}

				<form
					action="/{data.roleId === POS_ROLE_ID ? 'pos' : 'admin'}/order/{data.order._id}?/saveNote"
					method="post"
					class="contents"
				>
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
							<button type="submit" class="btn lg:w-auto w-full btn-blue self-start"
								>{t('order.note.saveText')}</button
							>
							<a href="/order/{data.order._id}/notes" class="btn lg:w-auto w-full btn-gray self-end"
								>{t('order.note.seeText')}</a
							>
						</div>
					</section>
				</form>
			{/if}
		</div>

		<div class="mt-6">
			<OrderSummary class="sticky top-4 -mr-2 -mt-2" order={data.order} />
		</div>
	</div>
	{#if data.cmsOrderBottom && data.cmsOrderBottomData}
		<CmsDesign
			challenges={data.cmsOrderBottomData.challenges}
			tokens={data.cmsOrderBottomData.tokens}
			sliders={data.cmsOrderBottomData.sliders}
			products={data.cmsOrderBottomData.products}
			pictures={data.cmsOrderBottomData.pictures}
			tags={data.cmsOrderBottomData.tags}
			digitalFiles={data.cmsOrderBottomData.digitalFiles}
			roleId={data.roleId ? data.roleId : ''}
			specifications={data.cmsOrderBottomData.specifications}
			contactForms={data.cmsOrderBottomData.contactForms}
			pageName={data.cmsOrderBottom.title}
			websiteLink={data.websiteLink}
			brandName={data.brandName}
			sessionEmail={data.email}
			countdowns={data.cmsOrderBottomData.countdowns}
			galleries={data.cmsOrderBottomData.galleries}
			leaderboards={data.cmsOrderBottomData.leaderboards}
			class={data.hideCmsZonesOnMobile ? 'hidden lg:contents' : ''}
		/>
	{/if}
</main>
