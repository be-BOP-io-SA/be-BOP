<script lang="ts">
	import { enhance } from '$app/forms';
	import { deepEquals } from '$lib/utils/deep-equals';

	export let data;
	$: disableForm = data.smtp.fake || data.settingsEnforcedByEnvVars;
	$: disableResetButton = deepEquals(data.defaultSmtpSettings, data.smtp);
	$: disableSubmitButton = data.settingsEnforcedByEnvVars;
</script>

<h1 class="text-3xl">SMTP Configuration</h1>

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
					SMTP Settings Configured via Environment Variables
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>
						The SMTP settings are currently controlled by your environment configuration, which
						takes precedence over the form bellow. To modify them, update or remove the following
						environment values (for example, in the be-BOP configuration file or your hosting
						provider’s settings), then restart be-BOP.
					</p>
					<ul class="mt-2 list-disc list-inside">
						<li>SMTP_FAKE</li>
						<li>SMTP_HOST</li>
						<li>SMTP_PORT</li>
						<li>SMTP_USER</li>
						<li>SMTP_PASSWORD</li>
						<li>SMTP_FROM</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
{:else}
	<p class="text-gray-600 mb-6">
		Configure your SMTP server settings for sending emails. Leave fields empty to use environment
		variables as fallback.
	</p>
{/if}

<form class="contents" method="post" action="?/save">
	<label
		class="form-label flex items-center flex-row {data.settingsEnforcedByEnvVars
			? 'opacity-50'
			: ''}"
	>
		<input
			bind:checked={data.smtp.fake}
			class="form-checkbox"
			disabled={data.settingsEnforcedByEnvVars}
			name="fake"
			type="checkbox"
		/>
		Use fake SMTP (for testing)
		<span class="text-sm text-gray-500 ml-2">Uses Ethereal Email for testing</span>
	</label>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 {disableForm ? 'opacity-50' : ''}">
		<label class="form-label">
			SMTP Host
			<input
				class="form-input"
				disabled={disableForm}
				name="host"
				placeholder="smtp.example.com"
				type="text"
				bind:value={data.smtp.host}
			/>
		</label>

		<label class="form-label">
			SMTP Port
			<input
				class="form-input"
				disabled={disableForm}
				max="65535"
				min="1"
				name="port"
				type="number"
				bind:value={data.smtp.port}
			/>
		</label>

		<label class="form-label">
			SMTP User
			<input
				class="form-input"
				disabled={disableForm}
				name="user"
				placeholder="your-email@example.com"
				type="text"
				bind:value={data.smtp.user}
			/>
		</label>

		<label class="form-label">
			SMTP Password
			<input
				class="form-input"
				disabled={disableForm}
				name="password"
				placeholder={data.smtp.passwordIsSet
					? 'Password is set - enter new value to replace'
					: 'Enter SMTP password'}
				type="password"
				value=""
			/>
		</label>

		<label class="form-label">
			From Email Address
			<input
				class="form-input"
				disabled={disableForm}
				name="from"
				placeholder="noreply@example.com"
				type="email"
				bind:value={data.smtp.from}
			/>
			<span class="text-sm text-gray-500">If empty, will use SMTP User as sender</span>
		</label>
	</div>

	<div class="flex justify-between mt-6">
		<button class="btn btn-black" type="submit" disabled={disableSubmitButton}
			>Save SMTP Settings</button
		>
		<button class="btn btn-red" type="submit" form="delete-form" disabled={disableResetButton}>
			Remove SMTP Settings
		</button>
	</div>
</form>

<form
	class="contents"
	method="post"
	action="?/delete"
	id="delete-form"
	use:enhance={(e) => {
		if (!confirm('Remove SMTP settings? (fake mode will be enabled)')) {
			e.cancel();
		}
	}}
></form>

<div class="mt-8 p-4 bg-blue-50 rounded-lg">
	<h3 class="text-lg font-semibold mb-2">Configuration Notes</h3>
	<ul class="text-sm space-y-1 text-gray-700">
		<li>• Port 587 is recommended for TLS/STARTTLS</li>
		<li>• Port 465 is used for SSL (deprecated but still common)</li>
		<li>• Port 25 is for unencrypted SMTP (not recommended)</li>
		<li>• Enable "fake" mode for development/testing without real SMTP server</li>
		<li>• These settings override environment variables when configured</li>
	</ul>
</div>
