<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let actionUrl: string;
	export let paymentId: string;

	let isOpen = false;
	let isSuccess = false;
	let errorKey = '';
</script>

{#if isSuccess}
	<p class="text-green-500">{t('order.forwardReceipt.success')}</p>
{:else if isOpen}
	<form
		action={actionUrl}
		method="post"
		class="flex flex-col gap-2"
		use:enhance={() => {
			errorKey = '';
			return async ({ result, update }) => {
				if (result.type === 'success') {
					isOpen = false;
					isSuccess = true;
				} else if (result.type === 'failure' && result.data?.error) {
					errorKey = String(result.data.error);
				} else {
					await update();
				}
			};
		}}
	>
		<input type="hidden" name="paymentId" value={paymentId} />
		{#if errorKey}
			<p class="text-red-500">{t('login.error.' + errorKey)}</p>
		{/if}
		<label class="form-label body-secondaryText">
			{t('login.authenticate.inputLabel')}
			<input
				class="form-input"
				type="text"
				name="address"
				placeholder="email / npub1..."
				required
				pattern="^(?!nsec).*"
				title={t('login.nsecBlockTitle')}
			/>
		</label>
		<div class="flex gap-2">
			<button type="submit" class="btn btn-black">
				{t('order.forwardReceipt.send')}
			</button>
			<button type="button" class="btn btn-gray" on:click={() => (isOpen = false)}>
				{t('order.forwardReceipt.cancel')}
			</button>
		</div>
	</form>
{:else}
	<button class="body-hyperlink self-start" type="button" on:click={() => (isOpen = true)}>
		{t('order.forwardReceipt.title')}
	</button>
{/if}
