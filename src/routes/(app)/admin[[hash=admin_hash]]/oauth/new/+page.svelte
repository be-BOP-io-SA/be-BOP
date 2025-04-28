<script lang="ts">
	import { page } from '$app/stores';
	let name = '';
	let slug = '';

	$: slug = name.toLowerCase().replace(/\s+/g, '-');
</script>

<h1 class="text-3xl">New OAuth provider</h1>

<p>
	Create an OAuth application with your provider of choice. Specify <span class="underline"
		>{$page.url.origin}/oauth/callback</span
	> as the redirect URL when creating the OAuth application.
</p>

<form class="flex flex-col gap-4" method="POST">
	<label class="form-label"
		>Provider name

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
		Slug
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
		Client id
		<input
			class="form-input"
			type="text"
			name="clientId"
			placeholder="1234567890-abcde.apps.googleusercontent.com"
			required
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
		/>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="enabled" class="form-checkbox" checked={true} />
		Enable this provider
	</label>

	<label class="form-label">
		Scope
		<input
			class="form-input"
			type="text"
			name="scope"
			placeholder="openid email profile"
			required
			value="openid email profile"
		/>
		<p class="text-sm">
			You can remove 'email' if you do not want to request the user's email address
		</p>
	</label>
	<button type="submit" class="btn btn-black self-start">Submit</button>
</form>
