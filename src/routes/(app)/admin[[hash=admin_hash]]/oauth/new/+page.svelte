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
		>OAuth provider name

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
		OAuth provider slug
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
		OAuth provider client id
		<input
			class="form-input"
			type="text"
			name="client_id"
			placeholder="1234567890-abcde.apps.googleusercontent.com"
			required
		/>
	</label>

	<label class="form-label">
		OAuth provider client secret
		<input
			class="form-input"
			type="text"
			name="client_secret"
			placeholder="abcde1234567890"
			required
		/>
	</label>

	<label class="form-label">
		OAuth provider url
		<input
			class="form-input"
			type="text"
			name="url"
			placeholder="https://accounts.google.com/"
			required
		/>
	</label>
	<button type="submit" class="btn btn-black self-start">Submit</button>
</form>
