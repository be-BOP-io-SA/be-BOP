<script lang="ts">
	import { page } from '$app/stores';
	export let data;

	$: currentSelected = $page.params.vatProfile;
</script>

<main class="max-w-7xl mx-auto px-6 w-full flex flex-col gap-4">
	<h1 class="text-3xl">Manage VAT profiles</h1>
	<p>
		You can create VAT profiles, with custom vat rates for specific countries. It is useful for
		products with specific VAT rates, like books in France and Switzerland.
	</p>

	{#if currentSelected}
		<a href="{data.adminPrefix}/config/vat" class="underline">Create new profile</a>
	{/if}

	<h2 class="text-2xl">VAT profiles</h2>

	{#if !data.vatProfiles.length}
		<p>No profile created yet</p>
	{:else}
		<ul class="ml-4 list-disc">
			{#each data.vatProfiles as profile}
				<li>
					{#if currentSelected === profile._id}
						<strong>{profile.name}</strong>
					{:else}
						<a href="{data.adminPrefix}/config/vat/{profile._id}" class="underline">
							{profile.name}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<slot />
</main>
