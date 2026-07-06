<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	type ImportTypeTypes = 'global' | 'catalog' | 'shopConfig';

	export let data;
	export let form;

	let authorizedExtensions = ['.json'];

	let importType: ImportTypeTypes | string = data.importType ?? 'global';
	let importOrders = false;
	let includePastChallenges = false;
	let importFiles = false;
</script>

{#if form?.success}
	<p class="alert-success">{t('admin.backup.importSuccess')}</p>
{/if}

{#if form?.message === 'warning'}
	<p class="alert-warning">{t('admin.backup.importWarning')}</p>
{/if}

{#if form?.message === 'error'}
	<p class="alert-error">{t('admin.backup.importErrorMessage')}</p>
{/if}

<h1 class="text-3xl">{t('admin.backup.importTitle')}</h1>
<form method="post" enctype="multipart/form-data" class="flex flex-col gap-4">
	<label for="file">{t('admin.backup.uploadFile')}</label>
	<input
		type="file"
		id="file"
		name="fileToUpload"
		accept={authorizedExtensions.join(',')}
		required
	/>

	<div class="flex flex-col gap-2">
		<h2 class="text-2xl">{t('admin.backup.importType')}</h2>

		<label class="checkbox-label">
			<input
				type="radio"
				bind:group={importType}
				class="form-radio"
				name="importType"
				value="global"
			/>
			{t('admin.backup.importTypeGlobal')}
		</label>

		<label class="checkbox-label">
			<input
				type="radio"
				bind:group={importType}
				class="form-radio"
				name="importType"
				value="catalog"
			/>
			{t('admin.backup.importTypeCatalog')}
		</label>

		<label class="checkbox-label">
			<input
				type="radio"
				bind:group={importType}
				class="form-radio"
				name="importType"
				value="shopConfig"
			/>
			{t('admin.backup.importTypeShopConfig')}
		</label>
	</div>

	<div class="flex flex-col gap-2">
		<h2 class="text-2xl">{t('admin.backup.specificImport')}</h2>

		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="importOrders" checked={importOrders} />
			{t('admin.backup.orders')}
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="includePastChallenges"
				checked={includePastChallenges}
			/>
			{t('admin.backup.passedChallenges')}
		</label>

		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="importFiles" bind:checked={importFiles} />
			{t('admin.backup.importFiles')}
		</label>

		<!-- {#if importFiles}
			<label for="importTypeFiles">Choose import type:</label>
			<select id="importTypeFiles" name="importTypeFiles">
				<option value="basic">Basic</option>
				<option value="checkWarn">Check & warn</option>
				<option value="checkClean">Check & clean</option>
			</select>
		{/if} -->
	</div>

	<button type="submit" class="btn btn-black self-start">{t('admin.backup.importButton')}</button>
</form>
