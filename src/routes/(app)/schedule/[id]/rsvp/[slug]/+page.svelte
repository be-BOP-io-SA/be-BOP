<script>
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;
	const { t } = useI18n();
</script>

<div class="mx-auto max-w-xl my-4">
	<form method="post" class="flex flex-col gap-4" action="?/notify">
		<span class="text-xl font-bold">{data.schedule.name}</span>
		<p>{t('schedule.rsvp.textMessage')}</p>
		<label class="form-label body-secondaryText">
			{t('login.authenticate.inputLabel')}
			<input
				class="form-input"
				type="text"
				name="address"
				placeholder="test@example.com"
				required
				pattern="^(?!nsec).*"
				title={t('login.nsecBlockTitle')}
			/>
		</label>
		<input class="form-input" type="hidden" name="scheduleId" value={data.schedule._id} />

		{#if form?.success}
			<p class="text-green-500">{t('schedule.rsvp.succesfulNotifyMessage')}</p>
		{/if}
		<div class="flex gap-4">
			<input type="submit" class="btn body-mainCTA" value={t('schedule.rsvp.notifyCta')} />
			<button class="btn body-secondaryCTA"
				><a href="/">{t('login.authenticate.ctaCancelLabel')}</a></button
			>
		</div>
	</form>
</div>
