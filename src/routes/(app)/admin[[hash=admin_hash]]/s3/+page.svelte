<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import type { ActionData } from './$types';

	export let data;
	let readOnlyForm = data.settingsEnforcedByEnvVars;
	let endpointUrl = data.s3.endpointUrl;
	let publicEndpointUrl = data.s3.publicEndpointUrl;
	let keySecret = '';

	let bucketInputEl: HTMLInputElement;
	let endpointInputEl: HTMLInputElement;
	let accessKeyInputEl: HTMLInputElement;
	let secretInputEl: HTMLInputElement;
	let titleEl: HTMLDivElement;

	function classifyAction(actionUrl: URL): 'save' | 'test' | undefined {
		switch (actionUrl.search) {
			case '?/save':
				return 'save';
			case '?/test':
				return 'test';
			default:
				return undefined;
		}
	}

	function validations() {
		return [
			{
				element: bucketInputEl,
				isValid: data.s3.bucket.trim(),
				message: 'S3 Bucket is required'
			},
			{
				element: endpointInputEl,
				isValid: endpointUrl.trim(),
				message: 'S3 Endpoint URL is required'
			},
			{
				element: accessKeyInputEl,
				isValid: data.s3.keyId.trim(),
				message: 'S3 Access Key is required'
			},
			{
				element: secretInputEl,
				isValid: !secretRequired() || keySecret.trim(),
				message:
					'S3 Secret Access Key is required when updating the endpoint or public endpoint URL'
			}
		];
	}

	function checkValidity() {
		let dataValid = true;
		for (const validation of validations()) {
			if (!validation.isValid) {
				validation.element?.setCustomValidity(validation.message);
				dataValid = false;
			} else {
				validation.element?.setCustomValidity('');
			}
		}
		return dataValid;
	}

	function clearValidity() {
		for (const validation of validations()) {
			validation.element?.setCustomValidity('');
		}
	}

	function secretRequired() {
		const sameRemote =
			endpointUrl === data.s3.endpointUrl &&
			(!publicEndpointUrl || publicEndpointUrl === data.s3.publicEndpointUrl);
		return !sameRemote;
	}

	function preserveFormFields(action: URL, result: ActionResult): boolean {
		if (result.type === 'success') {
			let data = result.data as unknown as ActionData;
			return !data?.actionResult.success || classifyAction(action) === 'test';
		}
		return false;
	}

	let actionResult:
		| { success: boolean; message: string; action: ReturnType<typeof classifyAction> }
		| undefined;

	function updateActionResult(action: URL, result: ActionResult) {
		if (result.type === 'success') {
			let data = result.data as unknown as ActionData;
			actionResult = data ? { ...data.actionResult, action: classifyAction(action) } : undefined;
		} else {
			actionResult = undefined;
		}
	}
</script>

<h1 class="text-3xl" bind:this={titleEl}>S3 Configuration</h1>

{#if data.settingsEnforcedByEnvVars}
	<div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
		<div class="flex items-start">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-yellow-800">
					S3 Settings Configured via Environment Variables
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>
						The S3 settings are currently controlled by your environment configuration, which takes
						precedence over the form bellow. To modify them, update or remove the following
						environment values (for example, in the be-BOP configuration file or your hosting
						provider’s settings), then restart be-BOP.
					</p>
					<ul class="mt-2 list-disc list-inside">
						<li>PUBLIC_S3_ENDPOINT_URL</li>
						<li>S3_BUCKET</li>
						<li>S3_ENDPOINT_URL</li>
						<li>S3_KEY_ID</li>
						<li>S3_KEY_SECRET</li>
						<li>S3_REGION</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-gray-600 mb-6">
		Configure your S3 storage settings for file uploads and static assets.
	</p>
{/if}

{#if actionResult}
	<div
		class="mb-6 p-4 rounded-lg scroll-m-10 {actionResult.success
			? 'bg-green-50 text-green-800'
			: 'bg-red-50 text-red-800'}"
	>
		<div class="flex items-center">
			<span class="mr-2">
				{#if actionResult.success}
					✅
				{:else}
					❌
				{/if}
			</span>
			{actionResult.message}
			{#if actionResult.action === 'save' && !actionResult.success}
				<br />The configuration was not saved because the provided settings are not valid.
			{/if}
		</div>
	</div>
{/if}

<form
	class="contents"
	method="post"
	action="?/save"
	use:enhance={({ formElement, cancel }) => {
		console.log('enhance');
		if (!checkValidity()) {
			formElement.reportValidity();
			cancel();
		}
		return async ({ action, update, result }) => {
			updateActionResult(action, result);
			if (preserveFormFields(action, result)) {
				await update({ reset: false });
			} else {
				await update();
			}
			titleEl?.scrollIntoView({ behavior: 'smooth' });
		};
	}}
>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 {readOnlyForm ? 'opacity-50' : ''}">
		<label class="form-label">
			S3 Bucket
			<input
				bind:this={bucketInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="bucket"
				placeholder="my-bucket-name"
				type="text"
				required
				bind:value={data.s3.bucket}
			/>
		</label>

		<label class="form-label">
			S3 Region
			<input
				class="form-input"
				readonly={readOnlyForm}
				name="region"
				placeholder="us-east-1"
				type="text"
				bind:value={data.s3.region}
			/>
		</label>

		<label class="form-label md:col-span-2">
			S3 Endpoint URL
			<input
				bind:this={endpointInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="endpointUrl"
				placeholder="https://s3.amazonaws.com"
				type="url"
				required
				bind:value={endpointUrl}
			/>
			<span class="text-sm text-gray-500">
				Enter the S3 endpoint URL for your storage service.
			</span>
		</label>

		<label class="form-label md:col-span-2">
			Public S3 Endpoint URL
			<input
				class="form-input"
				readonly={readOnlyForm}
				name="publicEndpointUrl"
				placeholder="https://my-bucket.s3.amazonaws.com"
				type="url"
				bind:value={publicEndpointUrl}
			/>
			<span class="text-sm text-gray-500">
				Public URL for accessing uploaded files. Usually your bucket's public URL. Leave empty to
				use the same endpoint URL.
			</span>
		</label>

		<label class="form-label">
			Access Key ID
			<input
				bind:this={accessKeyInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="keyId"
				placeholder="Enter S3 key ID"
				type="text"
				bind:value={data.s3.keyId}
			/>
		</label>

		<label class="form-label">
			Secret Access Key
			<input
				bind:this={secretInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="keySecret"
				type="password"
				placeholder={data.s3.keySecretIsSet
					? 'Key secret is set - enter new value to replace'
					: 'Enter S3 key secret'}
				bind:value={keySecret}
			/>
		</label>
	</div>

	<div class="flex justify-between items-center mt-6">
		<div class="flex gap-3">
			<button class="btn btn-black" type="submit" disabled={readOnlyForm} on:click={clearValidity}>
				Save S3 Settings
			</button>
			<button class="btn btn-blue" type="submit" formaction="?/test" on:click={clearValidity}>
				Test Connection
			</button>
		</div>
	</div>
</form>

<div class="mt-8 p-4 bg-blue-50 rounded-lg">
	<h3 class="text-lg font-semibold mb-2">Configuration Notes</h3>
	<ul class="text-sm space-y-1 text-gray-700">
		<li>• <strong>AWS S3:</strong> Leave endpoint URL empty, use your AWS region</li>
		<li>• <strong>MinIO/Compatible:</strong> Enter your MinIO endpoint URL and region</li>
		<li>• <strong>Public Endpoint:</strong> Used for generating public URLs for uploaded files</li>
		<li>• <strong>Security:</strong> Use IAM roles with minimal required permissions</li>
		<li>• <strong>Testing:</strong> Use the "Test Connection" button to verify your settings</li>
		<li>• These settings override environment variables when configured</li>
	</ul>
</div>

<div class="mt-6 p-4 bg-yellow-50 rounded-lg">
	<h3 class="text-lg font-semibold mb-2">Required S3 Permissions</h3>
	<div class="text-sm text-gray-700">
		<p class="mb-2">Your S3 credentials need the following permissions on the bucket:</p>
		<ul class="space-y-1 ml-4">
			<li>• <code>s3:GetObject</code> - Download files</li>
			<li>• <code>s3:PutObject</code> - Upload files</li>
			<li>• <code>s3:DeleteObject</code> - Delete files</li>
			<li>• <code>s3:ListBucket</code> - List bucket contents</li>
		</ul>
	</div>
</div>
