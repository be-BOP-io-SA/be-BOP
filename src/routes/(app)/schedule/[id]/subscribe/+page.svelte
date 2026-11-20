<script>
	import { useI18n } from '$lib/i18n';
	import NotificationAddressInput from '$lib/components/NotificationAddressInput.svelte';
	import { contactModesOrEmail } from '$lib/types/ContactMode';

	export let data;
	export let form;
	const { t } = useI18n();
</script>

<div class="mx-auto max-w-xl my-4">
	<form method="post" class="flex flex-col gap-4" action="?/addSubscription">
		<span class="text-xl font-bold">{data.schedule.name}</span>
		<p>{t('schedule.subscribe.formText')}</p>
		<NotificationAddressInput
			class="form-label body-secondaryText"
			modes={contactModesOrEmail(data.availableContactModes)}
			required
		/>
		<input class="form-input" type="hidden" name="scheduleId" value={data.schedule._id} />

		{#if form?.error}
			<p class="text-red-500">{t('login.error.' + form.error)}</p>
		{/if}
		{#if form?.success}
			<p class="text-green-500">{t('schedule.subscribe.formSuccessText')} {data.schedule.name}</p>
		{/if}
		<div class="flex gap-4">
			<input type="submit" class="btn body-mainCTA" value={t('schedule.subscribeCTA')} />
			<button class="btn body-secondaryCTA"
				><a href="/">{t('login.authenticate.ctaCancelLabel')}</a></button
			>
		</div>
	</form>
</div>
