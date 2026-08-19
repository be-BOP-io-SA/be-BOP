<script lang="ts">
	import IconStandBy from '$lib/components/icons/IconStandBy.svelte';
	import { useI18n } from '$lib/i18n';
	import type { ActionData } from './$types';
	export let form: ActionData;

	const { t } = useI18n();
</script>

<h1 class="text-2xl text-center">{t('admin.login.recoveryTitle')}</h1>
<div class="flex justify-center items-center">
	<form method="post" class="flex flex-col gap-4 p-6 w-[30em]">
		<div class="flex justify-center">
			<IconStandBy class="text-red-500" />
		</div>
		<label class="form-label">
			<input
				class="form-input"
				type="text"
				name="login"
				value={form?.login ?? ''}
				placeholder={t('admin.login.recoveryLoginPlaceholder')}
			/>
		</label>
		<div class="flex-wrap text-center">
			{#if !form?.success}
				<p>
					{t('admin.login.recoveryDisclaimer')}
				</p>
			{/if}
			{#if form?.success}
				{#if form.email}
					{#if form.isBackupEmail}
						<p class="text-green-500">{t('admin.login.recoverySentToShopEmail')}</p>
					{:else}
						<p class="text-green-500">
							{t('admin.login.recoverySentToUserEmail')}
						</p>
					{/if}
				{/if}
				{#if form.npub}
					<p class="text-green-500">{t('admin.login.recoverySentToNpub')}</p>
				{/if}
			{/if}
			{#if form?.failedFindUser}
				<p class="text-red-500">{t('admin.login.recoveryUserNotFound')}</p>
			{/if}
		</div>
		<div class="flex justify-center gap-4 mt-2">
			<input type="submit" class="btn btn-red text-white" value={t('admin.action.reset')} />
		</div>
	</form>
</div>
