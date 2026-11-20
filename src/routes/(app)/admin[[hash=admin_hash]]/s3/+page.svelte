<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import type { ActionData } from './$types';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

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
				message: t('admin.s3.bucketRequired')
			},
			{
				element: endpointInputEl,
				isValid: endpointUrl.trim(),
				message: t('admin.s3.endpointUrlRequired')
			},
			{
				element: accessKeyInputEl,
				isValid: data.s3.keyId.trim(),
				message: t('admin.s3.accessKeyRequired')
			},
			{
				element: secretInputEl,
				isValid: !secretRequired() || keySecret.trim(),
				message: t('admin.s3.secretRequiredWhenUpdatingEndpoint')
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

<h1 class="text-3xl" bind:this={titleEl}>{t('admin.s3.title')}</h1>

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
					{t('admin.s3.settingsConfiguredViaEnvVars')}
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>
						{t('admin.s3.envVarsExplanation')}
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
		{t('admin.s3.description')}
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
				<br />{t('admin.s3.configurationNotSaved')}
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
			{t('admin.s3.bucketLabel')}
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
			{t('admin.s3.regionLabel')}
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
			{t('admin.s3.endpointUrlLabel')}
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
				{t('admin.s3.endpointUrlHint')}
			</span>
		</label>

		<label class="form-label md:col-span-2">
			{t('admin.s3.publicEndpointUrlLabel')}
			<input
				class="form-input"
				readonly={readOnlyForm}
				name="publicEndpointUrl"
				placeholder="https://my-bucket.s3.amazonaws.com"
				type="url"
				bind:value={publicEndpointUrl}
			/>
			<span class="text-sm text-gray-500">
				{t('admin.s3.publicEndpointUrlHint')}
			</span>
		</label>

		<label class="form-label">
			{t('admin.s3.accessKeyIdLabel')}
			<input
				bind:this={accessKeyInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="keyId"
				placeholder={t('admin.s3.enterKeyIdPlaceholder')}
				type="text"
				bind:value={data.s3.keyId}
			/>
		</label>

		<label class="form-label">
			{t('admin.s3.secretAccessKeyLabel')}
			<input
				bind:this={secretInputEl}
				class="form-input"
				readonly={readOnlyForm}
				name="keySecret"
				type="password"
				placeholder={data.s3.keySecretIsSet
					? t('admin.s3.keySecretIsSetPlaceholder')
					: t('admin.s3.enterKeySecretPlaceholder')}
				bind:value={keySecret}
			/>
		</label>
	</div>

	<div class="flex justify-between items-center mt-6">
		<div class="flex gap-3">
			<button class="btn btn-black" type="submit" disabled={readOnlyForm} on:click={clearValidity}>
				{t('admin.s3.saveButton')}
			</button>
			<button class="btn btn-blue" type="submit" formaction="?/test" on:click={clearValidity}>
				{t('admin.s3.testConnectionButton')}
			</button>
		</div>
	</div>
</form>

<div class="mt-8 p-4 bg-blue-50 rounded-lg">
	<h3 class="text-lg font-semibold mb-2">{t('admin.s3.configurationNotesTitle')}</h3>
	<ul class="text-sm space-y-1 text-gray-700">
		<li>• <strong>AWS S3:</strong> {t('admin.s3.noteAwsS3')}</li>
		<li>• <strong>MinIO/Compatible:</strong> {t('admin.s3.noteMinioCompatible')}</li>
		<li>
			• <strong>{t('admin.s3.notePublicEndpointLabel')}:</strong>
			{t('admin.s3.notePublicEndpoint')}
		</li>
		<li>• <strong>{t('admin.s3.noteSecurityLabel')}:</strong> {t('admin.s3.noteSecurity')}</li>
		<li>
			• <strong>{t('admin.s3.noteTestingLabel')}:</strong>
			{t('admin.s3.noteTesting', { button: t('admin.s3.testConnectionButton') })}
		</li>
		<li>• {t('admin.s3.noteOverridesEnvVars')}</li>
	</ul>
</div>

<div class="mt-6 p-4 bg-yellow-50 rounded-lg">
	<h3 class="text-lg font-semibold mb-2">{t('admin.s3.requiredPermissionsTitle')}</h3>
	<div class="text-sm text-gray-700">
		<p class="mb-2">{t('admin.s3.requiredPermissionsIntro')}</p>
		<ul class="space-y-1 ml-4">
			<li>• <code>s3:GetObject</code> - {t('admin.s3.permissionDownloadFiles')}</li>
			<li>• <code>s3:PutObject</code> - {t('admin.s3.permissionUploadFiles')}</li>
			<li>• <code>s3:DeleteObject</code> - {t('admin.s3.permissionDeleteFiles')}</li>
			<li>• <code>s3:ListBucket</code> - {t('admin.s3.permissionListBucketContents')}</li>
		</ul>
	</div>
</div>
