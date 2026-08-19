<script lang="ts">
	import { formatDistance } from 'date-fns';
	import { useI18n } from '$lib/i18n';

	export let form;
	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.email.title')}</h1>

{#if form?.success}
	<p class="alert-success">{t('admin.email.queued')}</p>
{/if}

<form method="post" class="flex flex-col gap-6">
	<label class="form-label"
		>{t('admin.email.to')} <input type="email" name="to" required class="form-input" /></label
	>
	<label class="form-label"
		>{t('admin.email.subject')}
		<input type="text" name="subject" required class="form-input" /></label
	>
	<label class="form-label">
		{t('admin.email.body')}
		<textarea name="body" class="form-input" />
	</label>
	<button type="submit" class="btn btn-black self-start">{t('admin.email.send')}</button>
</form>

<h2 class="text-2xl">{t('admin.email.queuedSentEmails')}</h2>

<ul>
	{#each data.emails as email}
		<li>
			<p class="text-xl">{email.subject}</p>
			<p class="text-gray-600">
				{t('admin.email.to')}: {email.dest}
				{#if email.processedAt}
					- {t('admin.email.sent')}
					<time
						datetime={email.processedAt.toJSON()}
						title={email.processedAt.toLocaleString('en-UK')}
						>{formatDistance(email.processedAt, new Date(), { addSuffix: true })}</time
					>{/if}
			</p>
			{#if email.error}
				<p class="text-red-600">{t('admin.email.error', { message: email.error.message })}</p>
			{/if}
		</li>
	{/each}
</ul>
