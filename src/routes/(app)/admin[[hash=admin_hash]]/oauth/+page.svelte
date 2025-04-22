<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">OAuth Providers</h1>

You can add a "sign in with ..." to your bebop supporting any OAuth provider. Whether you want to
use Google, Discord or your own WordPress with the wp-oauth server plugin.

{#if data.oauth}
	<ul class="list-disc pl-5">
		{#each data.oauth as provider}
			<li>
				<a href="{data.adminPrefix}/oauth/{provider.slug}" class="underline">{provider.name}</a>
			</li>
		{/each}
	</ul>
{/if}

<a href="{data.adminPrefix}/oauth/new" class="underline block">Add OAuth Integration</a>
