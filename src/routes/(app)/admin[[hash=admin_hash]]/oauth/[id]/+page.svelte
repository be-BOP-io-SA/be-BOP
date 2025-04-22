<script>
	import { page } from '$app/stores';
	export let data;
</script>

<h1 class="text-3xl">Update OAuth provider</h1>

<p>
	Specify <span class="underline">{$page.url.origin}/oauth/callback</span> as the redirect URL when creating
	the OAuth application.
</p>

<form class="flex flex-col gap-4" method="POST">
	<label class="form-label"
		>Provider name

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
		Slug
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
		Client id
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
		Client secret
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
		Issuer
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
		Scope
		<input
			class="form-input"
			type="text"
			name="scope"
			placeholder="openid email profile"
			required
			value={data.provider.scope}
		/>
		<p class="text-sm">
			You can remove 'email' if you do not want to request the user's email address
		</p>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="enabled" class="form-checkbox" checked={data.provider.enabled} />
		Enable this provider
	</label>
	<div class="flex flex-row justify-between">
		<button type="submit" class="btn btn-black self-start" formaction="?/update">Submit</button>

		<button type="submit" class="btn btn-red self-start" formaction="?/delete"> Delete </button>
	</div>
</form>
