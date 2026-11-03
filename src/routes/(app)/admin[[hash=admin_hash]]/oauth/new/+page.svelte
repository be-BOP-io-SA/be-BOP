<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	let name = '';
	let slug = '';

	$: slug = name.toLowerCase().replace(/\s+/g, '-');

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.oauth.newTitle')}</h1>

<p>
	{t('admin.oauth.newDescriptionBefore')}
	<span class="underline">{$page.url.origin}/oauth/{slug || '[slug]'}/callback</span>
	{t('admin.oauth.redirectUrlDescriptionAfter')}
</p>

<form class="flex flex-col gap-4" method="POST">
	<label class="form-label"
		>{t('admin.oauth.providerName')}

		<input
			class="form-input"
			type="text"
			name="name"
			bind:value={name}
			placeholder="Google, Github, Discord, ..."
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.oauth.slug')}
		<input
			class="form-input"
			type="text"
			bind:value={slug}
			name="slug"
			placeholder="google, github, discord, ..."
			required
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
		/>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="enabled" class="form-checkbox" checked={true} />
		{t('admin.oauth.enableProvider')}
	</label>

	<label class="form-label">
		{t('admin.oauth.scope')}
		<input
			class="form-input"
			type="text"
			name="scope"
			placeholder="openid email profile"
			required
			value="openid email profile"
		/>
		<p class="text-sm">
			{t('admin.oauth.scopeEmailHint')}
		</p>
	</label>
	<button type="submit" class="btn btn-black self-start">{t('admin.action.save')}</button>
</form>
