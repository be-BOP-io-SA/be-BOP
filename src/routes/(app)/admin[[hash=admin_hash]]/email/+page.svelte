<script lang="ts">
	import { formatDistance } from 'date-fns';

	export let form;
	export let data;
</script>

<h1 class="text-3xl">Emails</h1>

{#if form?.success}
	<p class="alert-success">Email queued</p>
{/if}

<form method="post" class="flex flex-col gap-6">
	<label class="form-label">To <input type="email" name="to" required class="form-input" /></label>
	<label class="form-label"
		>Subject <input type="text" name="subject" required class="form-input" /></label
	>
	<label class="form-label">
		Body
		<textarea name="body" class="form-input"></textarea>
	</label>
	<button type="submit" class="btn btn-black self-start">Send</button>
</form>

<h2 class="text-2xl">Queued/Sent emails</h2>

<ul>
	{#each data.emails as email}
		<li>
			<p class="text-xl">{email.subject}</p>
			<p class="text-gray-600">
				To: {email.dest}
				{#if email.processedAt}
					- Sent <time
						datetime={email.processedAt.toJSON()}
						title={email.processedAt.toLocaleString('en-UK')}
						>{formatDistance(email.processedAt, new Date(), { addSuffix: true })}</time
					>{/if}
			</p>
			{#if email.error}
				<p class="text-red-600">Error: {email.error.message}</p>
			{/if}
		</li>
	{/each}
</ul>
