<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let confirmRestart = false;
	let confirmUpdate = false;
	let confirmRollback = false;
	let rollbackK = 1;
</script>

<h1 class="text-3xl">Installation be-BOP</h1>

{#if data.failedFlag}
	<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
		<h3 class="text-sm font-medium text-red-800">Last env override attempt failed</h3>
		<p class="mt-2 text-sm text-red-700">
			At {data.failedFlag.at instanceof Date
				? data.failedFlag.at.toISOString()
				: data.failedFlag.at}
		</p>
		<p class="mt-1 text-sm text-red-700">
			Reason: <code>{data.failedFlag.reason}</code>
		</p>
		<p class="mt-2 text-sm text-red-700">
			The override file is still in your S3 bucket but be-BOP did not apply it. Upload a corrected
			file or delete the override below to clear this state.
		</p>
	</div>
{/if}

{#if form?.success}
	<div class="mt-4 p-4 bg-green-50 text-green-800 rounded-lg">
		✅ {form.message}
	</div>
{/if}

<section class="mt-8">
	<h2 class="text-2xl">Restart</h2>
	<p class="text-gray-600 mt-1">
		Restart triggers an exit signal that a supervising orchestrator will pick up. If no orchestrator
		is configured, be-BOP will simply stop and you will need to start it again manually.
	</p>

	<div class="mt-4 flex gap-3 flex-wrap">
		<form
			method="post"
			action="?/restart"
			use:enhance={({ cancel }) => {
				if (!confirm('Restart be-BOP now? Active sessions will be briefly interrupted.')) {
					cancel();
				}
				confirmRestart = true;
			}}
		>
			<button class="btn btn-black" type="submit" disabled={confirmRestart}>Restart be-BOP</button>
		</form>

		<form
			method="post"
			action="?/updateLatest"
			use:enhance={({ cancel }) => {
				if (
					!confirm(
						'Update be-BOP to the latest public release and restart? Active sessions will be interrupted.'
					)
				) {
					cancel();
				}
				confirmUpdate = true;
			}}
		>
			<button class="btn btn-blue" type="submit" disabled={confirmUpdate}>Update be-BOP</button>
		</form>
	</div>
</section>

<section class="mt-8">
	<h2 class="text-2xl">Use previous be-BOP version</h2>
	<p class="text-gray-600 mt-1">
		Rolls back to the N-k public release. The orchestrator resolves k against the 10 latest public
		releases on GitHub.
	</p>

	<form
		method="post"
		action="?/rollback"
		class="mt-4 flex gap-3 items-end flex-wrap"
		use:enhance={({ cancel }) => {
			if (!confirm(`Roll back ${rollbackK} version(s) and restart?`)) {
				cancel();
			}
			confirmRollback = true;
		}}
	>
		<label class="form-label">
			Previous version
			<select name="k" class="form-input" bind:value={rollbackK}>
				{#each Array.from({ length: data.rollbackMaxStep }, (_, i) => i + 1) as k}
					<option value={k}>{k} version{k > 1 ? 's' : ''} ago</option>
				{/each}
			</select>
		</label>
		<button class="btn btn-black" type="submit" disabled={confirmRollback}
			>Update &amp; restart</button
		>
	</form>
</section>

<section class="mt-8">
	<h2 class="text-2xl">Override settings</h2>

	<div class="mt-2 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
		<p class="font-semibold mb-1">How to use</p>
		<ol class="list-decimal list-inside space-y-1">
			<li>
				Compose a plain text file on your machine with one <code>KEY=VALUE</code> per line.
			</li>
			<li>
				Only the following keys are accepted (other lines will be rejected at upload):
				<code>{data.allowedKeys.join(', ')}</code>
			</li>
			<li>Comments start with <code>#</code>. Blank lines are ignored.</li>
			<li>
				Save the file and upload it below. When you are ready, click <em>Restart be-BOP</em> in the
				section above. On next boot, the override will be applied if the target connection is
				reachable.
			</li>
			<li>
				If the override fails to apply, be-BOP starts normally and shows a warning on this page. You
				can then upload a corrected file or delete the override.
			</li>
		</ol>
	</div>

	{#if !data.s3Configured}
		<div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
			S3 is not configured yet. Configure it in <a href="../s3" class="underline">S3 Storage</a> first.
		</div>
	{:else}
		{#if data.overrideFileExists}
			<p class="mt-4 text-sm text-gray-700">
				An override file is currently stored in your S3 bucket. Uploading a new file will overwrite
				it entirely.
			</p>
		{:else}
			<p class="mt-4 text-sm text-gray-700">No override file in the S3 bucket yet.</p>
		{/if}

		<form
			method="post"
			action="?/save"
			enctype="multipart/form-data"
			class="mt-4 flex flex-col gap-3"
			use:enhance
		>
			<label class="form-label">
				Override file
				<input
					type="file"
					name="override"
					accept=".env,.txt,text/plain"
					required
					class="form-input"
				/>
			</label>
			<div>
				<button class="btn btn-black" type="submit">Save</button>
			</div>
		</form>

		{#if data.overrideFileExists || data.failedFlag}
			<form
				method="post"
				action="?/delete"
				class="mt-3"
				use:enhance={({ cancel }) => {
					if (
						!confirm(
							'Delete the override file from S3? This does not restart be-BOP — the current configuration remains active until next restart.'
						)
					) {
						cancel();
					}
				}}
			>
				<button class="btn btn-red" type="submit">Delete override</button>
			</form>
		{/if}
	{/if}
</section>
