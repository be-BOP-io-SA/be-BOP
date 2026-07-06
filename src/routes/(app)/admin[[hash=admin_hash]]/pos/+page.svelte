<script lang="ts">
	import ManageOrderTabs from '$lib/components/ManageOrderTabs.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { MultiSelect } from 'svelte-multiselect';
	import { useI18n } from '$lib/i18n';
	import type { TagGroup } from '$lib/types/TagGroup';
	export let data;

	const { t } = useI18n();

	let tabGroups = data.posTabGroups;
	let tagGroups: TagGroup[] = data.tagGroups ?? [];
	let posPoolEmptyIcon = data.posPoolEmptyIcon || '';
	let posPoolOccupiedIcon = data.posPoolOccupiedIcon || '';

	const groupSelectionsMap: Record<string, Array<{ value: string; label: string }>> = {};

	// Initialize from existing tagGroups (one-time, not reactive)
	tagGroups.forEach((group) => {
		groupSelectionsMap[group._id] = group.tagIds.map((tagId) => ({
			value: tagId,
			label: data.tags.find((t) => t._id === tagId)?.name ?? tagId
		}));
	});

	function syncSelectionsToGroups() {
		tagGroups = tagGroups.map(
			(g): TagGroup => ({
				...g,
				tagIds: groupSelectionsMap[g._id]?.map((s) => s.value) ?? g.tagIds
			})
		);
	}

	function getAllTagIdsFromGroups(): string[] {
		const allTagIds = new Set<string>();
		tagGroups.forEach((group) => {
			const tagIds = groupSelectionsMap[group._id]?.map((s) => s.value) ?? group.tagIds;
			tagIds.forEach((id) => allTagIds.add(id));
		});
		return Array.from(allTagIds);
	}

	$: serializedTabGroups = JSON.stringify(tabGroups);
	$: serializedTagGroups = JSON.stringify(tagGroups);

	let posDisplayOrderQrAfterPayment = data.posDisplayOrderQrAfterPayment;
	let posUseSelectForTags = data.posUseSelectForTags;

	let posSession = { ...data.posSession };

	$: if (
		(posSession.allowXTicketEditing || posSession.cashDeltaJustificationMandatory) &&
		!posSession.enabled
	) {
		posSession.enabled = true;
	}

	function handleSubmit(event: Event) {
		syncSelectionsToGroups();

		// Only warn for button mode (not dropdown mode)
		if (!posUseSelectForTags) {
			const { maxGroup, maxCount } = tagGroups.reduce(
				(acc, group) => {
					const count = groupSelectionsMap[group._id]?.length ?? group.tagIds.length;
					return count > acc.maxCount ? { maxGroup: group, maxCount: count } : acc;
				},
				{ maxGroup: null as TagGroup | null, maxCount: 0 }
			);

			if (maxCount > 8 && maxGroup) {
				const confirmMessage = t('pos.tagGroups.tooManyTagsWarning', {
					groupName: maxGroup.name,
					count: maxCount.toString()
				});
				if (!confirm(confirmMessage)) {
					event.preventDefault();
				}
			}
		}
	}
</script>

<h1 class="text-3xl">{t('admin.pos.title')}</h1>

<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
	<p class="text-sm text-blue-900">
		ℹ️
		<Trans key="admin.pos.tapToPaySettingsMoved">
			<a href="/admin/pos-payments" class="font-bold underline" slot="0" let:translation>
				{translation}
			</a>
		</Trans>
	</p>
</div>

<form method="post" class="flex flex-col gap-6" on:submit={handleSubmit}>
	<h2 class="text-2xl">{t('admin.pos.sessionManagementTitle')}</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posSession.forbidTouchWhenSessionClosed"
			class="form-checkbox"
			bind:checked={posSession.forbidTouchWhenSessionClosed}
		/>
		{t('admin.pos.forbidTouchWhenClosed')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posSession.enabled"
			class="form-checkbox"
			bind:checked={posSession.enabled}
		/>
		{t('admin.pos.enableZTicketManagement')}
	</label>

	{#if posSession.enabled}
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posSession.allowXTicketEditing"
				class="form-checkbox"
				bind:checked={posSession.allowXTicketEditing}
			/>
			{t('admin.pos.allowXTicketEditing')}
		</label>

		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posSession.cashDeltaJustificationMandatory"
				class="form-checkbox"
				bind:checked={posSession.cashDeltaJustificationMandatory}
			/>
			{t('admin.pos.cashDeltaJustificationMandatory')}
		</label>
	{/if}

	<h2 class="text-2xl mt-8">{t('admin.pos.checkoutTitle')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posPrefillTermOfUse"
			class="form-checkbox"
			checked={data.posPrefillTermOfUse}
		/>
		{t('admin.pos.prefillTermOfUse')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posDisplayOrderQrAfterPayment"
			class="form-checkbox"
			bind:checked={posDisplayOrderQrAfterPayment}
		/>
		{t('admin.pos.displayOrderQrAfterPayment')}
	</label>
	{#if posDisplayOrderQrAfterPayment}
		<label class="form-label">
			{t('admin.pos.timeBeforeRedirecting')}

			<input
				type="number"
				step="1"
				name="posQrCodeAfterPayment.timeBeforeRedirecting"
				class="form-input"
				value={data.posQrCodeAfterPayment.timeBeforeRedirecting}
			/>
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posQrCodeAfterPayment.displayCustomerCta"
				class="form-checkbox"
				checked={data.posQrCodeAfterPayment.displayCustomerCta}
			/>
			{t('admin.pos.displayCustomerCtaAfterPayment')}
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posQrCodeAfterPayment.removeBebobLogo"
				class="form-checkbox"
				checked={data.posQrCodeAfterPayment.removeBebobLogo}
			/>
			{t('admin.pos.removeLogoFromQrCode')}
		</label>
	{/if}

	<h2 class="text-2xl mt-8">{t('admin.pos.tapToPayReconciliationTitle')}</h2>
	<label class="form-label">
		{t('admin.pos.selectTapToPayProvider')}
		<select name="tapToPayProvider" class="form-input max-w-[25rem]">
			{#each data.tapToPay.providers as provider}
				<option
					value={provider.provider}
					selected={data.tapToPay.currentProcessor === provider.provider}
					disabled={!provider.available}
				>
					{provider.displayName}
				</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.pos.fillMobileAppUrl')}
		<input
			type="text"
			class="form-input max-w-[25rem]"
			name="tapToPayOnActivationUrl"
			placeholder="e.g. https://open.paynow-app.com"
			value={data.tapToPay.onActivationUrl}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.pos.touchscreenInterfaceTitle')}</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posSession.lockItemsAfterMidTicket"
			class="form-checkbox"
			bind:checked={posSession.lockItemsAfterMidTicket}
		/>
		{t('admin.pos.lockItemsAfterMidTicket')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posUseSelectForTags"
			class="form-checkbox"
			bind:checked={posUseSelectForTags}
		/>
		{t('pos.useSelectForTags')}
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.pos.productTags')}

		{#each tagGroups as group, idx (group._id)}
			<div class="border border-gray-300 rounded-lg mb-4">
				<div class="flex justify-between items-center bg-gray-100 gap-2 px-4 py-2">
					<input
						type="text"
						bind:value={group.name}
						placeholder={t('pos.tagGroups.groupNamePlaceholder')}
						class="border font-semibold rounded px-2 py-1 text-sm"
					/>
					<button
						type="button"
						class="text-sm text-red-600 hover:underline"
						on:click|preventDefault|stopPropagation={() => {
							const deletedGroupId = group._id;
							tagGroups = tagGroups.filter((g, i) => i !== idx);
							delete groupSelectionsMap[deletedGroupId];
						}}
					>
						{t('pos.tagGroups.deleteGroup')}
					</button>
				</div>

				<!-- svelte-ignore a11y-label-has-associated-control -->
				<label class="form-label px-4 py-3">
					<MultiSelect
						--sms-options-bg="var(--body-mainPlan-backgroundColor)"
						options={data.tags.map((tag) => ({ value: tag._id, label: tag.name }))}
						bind:selected={groupSelectionsMap[group._id]}
					/>
				</label>
			</div>
		{/each}
	</label>

	<div class="border rounded-lg shadow-sm w-fit mb-4">
		<div class="flex justify-center items-center bg-gray-50 px-4 py-2">
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline"
				on:click={() => {
					const newGroupId = `temp-${Date.now()}`;
					tagGroups = [
						...tagGroups,
						{
							_id: newGroupId,
							name: '',
							tagIds: [],
							order: tagGroups.length,
							createdAt: new Date(),
							updatedAt: new Date()
						}
					];
					groupSelectionsMap[newGroupId] = [];
				}}
			>
				{t('pos.tagGroups.addGroup')}
			</button>
		</div>
	</div>

	<input type="hidden" name="tagGroups" value={serializedTagGroups} />
	<input type="hidden" name="posTouchTag" value={JSON.stringify(getAllTagIdsFromGroups())} />

	<label class="form-label">
		{t('admin.pos.poolOccupiedLabel')}
		<small class="text-gray-600"
			>{t('admin.pos.defaultIconHint', { icon: data.defaultFullPoolIcon })}</small
		>
		<input
			type="text"
			name="posPoolOccupiedIcon"
			class="form-input"
			bind:value={posPoolOccupiedIcon}
		/>
	</label>

	<label class="form-label">
		{t('admin.pos.poolEmptyLabel')}
		<small class="text-gray-600"
			>{t('admin.pos.defaultIconHint', { icon: data.defaultEmptyPoolIcon })}</small
		>
		<input type="text" name="posPoolEmptyIcon" class="form-input" bind:value={posPoolEmptyIcon} />
	</label>

	<label class="form-label">
		{t('pos.midTicket.topBlankLines')}
		<small class="text-gray-600">{t('pos.midTicket.topBlankLinesHint')}</small>
		<input
			type="number"
			name="posMidTicketTopBlankLines"
			class="form-input max-w-[10rem]"
			min="0"
			max="20"
			value={data.posMidTicketTopBlankLines}
		/>
	</label>

	<label class="form-label">
		{t('admin.pos.productsPerPage')}
		<small class="text-gray-600">{t('admin.pos.productsPerPageHint')}</small>
		<input
			type="number"
			name="posProductsPerPage"
			class="form-input"
			min="0"
			value={data.posProductsPerPage ?? 0}
		/>
	</label>

	<label class="form-label">
		{t('admin.pos.mobileBreakpoint')}
		<small class="text-gray-600">{t('admin.pos.mobileBreakpointHint')}</small>
		<input
			type="number"
			name="posMobileBreakpoint"
			class="form-input max-w-[10rem]"
			min="500"
			max="1500"
			value={data.posMobileBreakpoint ?? 1024}
		/>
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.pos.tabsManagement')}
		<ManageOrderTabs bind:tabGroups />
	</label>
	<input type="hidden" name="posTabGroups" bind:value={serializedTabGroups} />

	<div>
		<input type="submit" value={t('admin.action.update')} class="btn btn-blue self-start" />
	</div>
</form>
