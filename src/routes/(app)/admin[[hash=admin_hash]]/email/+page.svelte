<script lang="ts">
	import { typedEntries } from '$lib/utils/typedEntries.js';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { formatDistance } from 'date-fns';

	export let form;
	export let data;
	$: zippedTemplates = typedEntries(data.orderEmailTemplates).map(([key, template]) => {
		return {
			key,
			sendCopyToAdmin:
				template.sendCopyToAdmin ?? data.orderEmailTemplatesDefault[key].sendCopyToAdmin,
			sendToUser: template.sendToUser ?? data.orderEmailTemplatesDefault[key].sendToUser
		};
	});
</script>

<h1 class="text-3xl">Emails Config</h1>
<form method="post" action="?/update" class="flex flex-col gap-6">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="copyOrderEmailsToAdmin"
			class="form-checkbox"
			checked={data.copyOrderEmailsToAdmin && !!data.sellerIdentity?.contact.email}
			disabled={!data.sellerIdentity?.contact.email}
		/>
		Copy order emails to {data.sellerIdentity?.contact.email || '[no email address]'} (set in
		<a href="{data.adminPrefix}/identity" class="body-hyperlink underline">identity</a> section)
	</label>

	<div class="grid grid-cols-3 gap-2">
		{#each zippedTemplates as template, i}
			<h2 class="text-xl">{upperFirst(template.key.toString())}</h2>
			<input type="hidden" name="emailTemplates[{i}].key" value={template.key} />
			<label class="checkbox-label">
				<input
					type="checkbox"
					name="emailTemplates[{i}].sendToUser"
					class="form-checkbox"
					checked={template.sendToUser}
				/>
				Send to user
			</label>
			<label class="checkbox-label">
				<input
					type="checkbox"
					name="emailTemplates[{i}].sendCopyToAdmin"
					class="form-checkbox"
					checked={template.sendCopyToAdmin}
				/>
				Send copy to admin
			</label>
		{/each}
		<div class="flex">
			<input type="submit" value="Update" class="btn body-mainCTA self-start" />
		</div>
	</div>
</form>

<h1 class="text-3xl">Emails</h1>

{#if form?.success}
	<p class="alert-success">Email queued</p>
{/if}

<form method="post" class="flex flex-col gap-6" action="?/send">
	<label class="form-label">To <input type="email" name="to" required class="form-input" /></label>
	<label class="form-label"
		>Subject <input type="text" name="subject" required class="form-input" /></label
	>
	<label class="form-label">
		Body
		<textarea name="body" class="form-input" />
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
