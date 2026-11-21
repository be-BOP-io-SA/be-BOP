<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;

	const { t, locale } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.terminalPayments.title')}</h1>

<p>{t('admin.terminalPayments.intro')}</p>

<a href={data.onlyNoRef ? '?' : '?noRef=1'} class="underline self-start">
	{data.onlyNoRef ? t('admin.terminalPayments.showAll') : t('admin.terminalPayments.showNoRef')}
</a>

{#if data.payments.length}
	<table class="table-auto w-full text-left">
		<thead>
			<tr>
				<th>#</th>
				<th>{t('admin.terminalPayments.date')}</th>
				<th>{t('admin.terminalPayments.sale')}</th>
				<th>{t('admin.terminalPayments.tip')}</th>
				<th>{t('admin.terminalPayments.method')}</th>
				<th>{t('admin.terminalPayments.status')}</th>
				<th>{t('admin.terminalPayments.ref')}</th>
				<th>{t('admin.terminalPayments.device')}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.payments as payment}
				<tr class="align-top">
					<td>{payment.number}</td>
					<td>{new Date(payment.createdAt).toLocaleString($locale)}</td>
					<td
						><PriceTag
							inline
							amount={payment.amount.amount}
							currency={payment.amount.currency}
						/></td
					>
					<td><PriceTag inline amount={payment.tip.amount} currency={payment.tip.currency} /></td>
					<td>{t(`checkout.paymentMethod.${payment.method}`)} · {payment.processor ?? ''}</td>
					<td>
						{t(`order.paymentStatus.${payment.status}`)}
						{#if payment.overpayment}
							<br /><span class="text-sm">
								{t('admin.terminalPayments.overpaid')}
								<PriceTag
									inline
									amount={payment.overpayment.amount.amount}
									currency={payment.overpayment.amount.currency}
								/>
								{#if payment.overpayment.treatment}
									· {payment.overpayment.treatment === 'tip'
										? t('admin.terminalPayments.overpaidTip')
										: t('admin.terminalPayments.overpaidRefund')}
								{/if}
							</span>
						{/if}
					</td>
					<td>
						<form method="post" action="?/setRef" class="flex gap-1">
							<input type="hidden" name="id" value={payment._id} />
							<input
								type="text"
								name="ref"
								class="form-input"
								maxlength="100"
								value={payment.externalRef ?? ''}
								placeholder={t('admin.terminalPayments.noRef')}
								required
							/>
							<button type="submit" class="btn btn-black">{t('admin.action.save')}</button>
						</form>
						{#each payment.externalRefHistory as change}
							<p class="text-xs opacity-70">
								{t('admin.terminalPayments.refChange', {
									from: change.from ?? t('admin.terminalPayments.noRef'),
									to: change.to,
									date: new Date(change.at).toLocaleString($locale),
									by: change.by ?? ''
								})}
							</p>
						{/each}
					</td>
					<td>{payment.device}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>{t('admin.terminalPayments.empty')}</p>
{/if}
