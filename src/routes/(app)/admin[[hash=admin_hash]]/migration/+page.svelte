<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	export let data;
	export let form;

	let selectedConnector: string = data.connectors[0]?.id ?? '';

	$: adminPrefix = $page.url.pathname.replace(/\/migration$/, '');
</script>

<h1 class="text-3xl">Migration</h1>
<p>Migrate content from an external source (WordPress, …) into be-BOP.</p>

<h2 class="text-2xl mt-6">Saved sources</h2>
{#if data.sources.length === 0}
	<p>No source saved yet. Use the form below to add one.</p>
{:else}
	<table class="w-full">
		<thead>
			<tr>
				<th class="text-left">Label</th>
				<th class="text-left">Connector</th>
				<th class="text-left">Config</th>
				<th class="text-left">Last test</th>
				<th class="text-left">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.sources as src}
				<tr>
					<td class="font-semibold">{src.label}</td>
					<td>{src.connectorLabel}</td>
					<td class="text-sm">
						{#each Object.entries(src.config) as [k, v]}
							<div><span class="text-gray-500">{k}:</span> {String(v)}</div>
						{/each}
					</td>
					<td class="text-sm">
						{#if src.lastTestResult}
							<span class={src.lastTestResult.ok ? 'text-green-600' : 'text-red-500'}>
								{src.lastTestResult.ok ? '✓' : '✗'}
								{src.lastTestResult.message}
							</span>
							{#if src.lastTestedAt}
								<div class="text-gray-500">
									{new Date(src.lastTestedAt).toLocaleString()}
								</div>
							{/if}
						{:else}
							<span class="text-gray-500">never tested</span>
						{/if}
					</td>
					<td>
						<form method="post" use:enhance class="inline-flex gap-2">
							<input type="hidden" name="sourceId" value={src._id} />
							<button class="btn btn-black" formaction="?/start">Fetch from</button>
							<button class="btn btn-gray" formaction="?/testConnection">Test</button>
							<button class="btn btn-red" formaction="?/deleteSource">Delete</button>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="text-2xl mt-6">Add new source</h2>
{#if data.connectors.length === 0}
	<p>No migration connector available.</p>
{:else}
	<form method="post" use:enhance class="flex flex-col gap-3">
		<label class="form-label">
			Source type
			<select bind:value={selectedConnector} name="source" class="form-input">
				{#each data.connectors as c}
					<option value={c.id}>{c.label}</option>
				{/each}
			</select>
		</label>

		<label class="form-label">
			Label (admin name for this source)
			<input type="text" name="label" class="form-input" placeholder="Pilot shop" required />
		</label>

		{#if selectedConnector === 'wordpress'}
			<label class="form-label">
				WordPress URL
				<input
					type="url"
					name="wpUrl"
					placeholder="https://example.com"
					class="form-input"
					required
				/>
			</label>
			<label class="form-label">
				Username
				<input type="text" name="username" class="form-input" required />
			</label>
			<label class="form-label">
				Application Password
				<input type="password" name="appPassword" class="form-input" required />
			</label>
			<label class="checkbox-label">
				<input type="checkbox" name="fetchAllMedia" class="form-checkbox" checked />
				Fetch entire WP media library (uncheck to fetch only referenced images)
			</label>
		{/if}

		<div class="flex gap-2">
			<button type="submit" formaction="?/saveSource" class="btn btn-black self-start">
				Save source
			</button>
			<button type="submit" formaction="?/testConnection" class="btn btn-gray self-start">
				Test connection
			</button>
		</div>

		{#if form?.test}
			<p class={form.test.ok ? 'text-green-600' : 'text-red-500'}>
				{form.test.message}
			</p>
		{/if}
		{#if form?.error}
			<p class="text-red-500">{form.error}</p>
		{/if}
		{#if form?.savedSourceId}
			<p class="text-green-600">Source saved.</p>
		{/if}
		{#if form?.jobId}
			<p class="text-green-600">Job started: {form.jobId}</p>
		{/if}
		{#if form?.deleted}
			<p class="text-green-600">Source deleted.</p>
		{/if}
	</form>
{/if}

<h2 class="text-2xl mt-6">Recent jobs</h2>
{#if data.jobs.length === 0}
	<p>No migration job yet.</p>
{:else}
	<table class="w-full">
		<thead>
			<tr>
				<th class="text-left">Source</th>
				<th class="text-left">Status</th>
				<th class="text-left">Progress</th>
				<th class="text-left">Counts</th>
				<th class="text-left">Created</th>
				<th class="text-left"></th>
			</tr>
		</thead>
		<tbody>
			{#each data.jobs as job}
				<tr>
					<td>{job.source}</td>
					<td>{job.status}</td>
					<td>
						{#if job.progress}
							{job.progress.step}: {job.progress.current}/{job.progress.total}
						{:else}
							—
						{/if}
					</td>
					<td>
						{#each Object.entries(job.counts ?? {}) as [type, count]}
							<span class="mr-2">{type}: {count}</span>
						{/each}
					</td>
					<td>{new Date(job.createdAt).toLocaleString()}</td>
					<td>
						<a
							href="{adminPrefix}/migration/job/{job._id}"
							class="body-hyperlink underline"
						>
							View
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
