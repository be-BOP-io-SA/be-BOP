<script>
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.oauth.updateTitle')}</h1>

<p>
	{t('admin.oauth.redirectUrlDescriptionBefore')}
	<span class="underline">{$page.url.origin}/oauth/{data.provider.slug}/callback</span>
	{t('admin.oauth.redirectUrlDescriptionAfter')}
</p>

<form class="flex flex-col gap-4" method="POST">
	<label class="form-label"
		>{t('admin.oauth.providerName')}

		<input
			class="form-input"
			type="text"
			name="name"
			value={data.provider.name}
			placeholder="Google, Github, Discord, ..."
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.slug')}
		<input
			class="form-input"
			type="text"
			value={data.provider.slug}
			name="slug"
			placeholder="google, github, discord, ..."
			required
			disabled
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.clientId')}
		<input
			class="form-input"
			type="text"
			name="clientId"
			placeholder="1234567890-abcde.apps.googleusercontent.com"
			required
			value={data.provider.clientId}
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.clientSecret')}
		<input
			class="form-input"
			type="text"
			name="clientSecret"
			placeholder="abcde1234567890"
			required
			value={data.provider.clientSecret}
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.issuer')}
		<input
			class="form-input"
			type="text"
			name="issuer"
			placeholder="https://accounts.google.com/ or https://my-wordpress.com/wp-json/moserver/xxx"
			required
			value={data.provider.issuer}
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.scope')}
		<input
			class="form-input"
			type="text"
			name="scope"
			placeholder="openid email profile"
			required
			value={data.provider.scope}
		/>
		<p class="text-sm">
			{t('admin.oauth.scopeEmailHint')}
		</p>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="enabled" class="form-checkbox" checked={data.provider.enabled} />
		{t('admin.oauth.enableProvider')}
	</label>
	<div class="flex flex-row justify-between">
		<button type="submit" class="btn btn-black self-start" formaction="?/update"
			>{t('admin.action.update')}</button
		>

		<button type="submit" class="btn btn-red self-start" formaction="?/delete">
			{t('admin.oauth.delete')}
		</button>
	</div>
</form>
