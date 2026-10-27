<script lang="ts">
	import { MultiSelect } from 'svelte-multiselect';
	import { useI18n } from '$lib/i18n';
	export let data;
	let selectedLabel =
		data.orderLabelIds?.map((orderLabel) => ({
			value: orderLabel,
			label: data.labels.find((label) => label._id === orderLabel)?.name ?? orderLabel
		})) ?? [];

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.order.orderLabelTitle')}</h1>

<form method="post" class="flex flex-col gap-6">
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.order.orderLabelIds')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={data.labels.map((label) => ({
				value: label._id,
				label: label.name
			}))}
			bind:selected={selectedLabel}
		/>
	</label>
	{#each selectedLabel.map((label) => label.value) as labelId, i}
		<input type="hidden" name="orderLabelIds[{i}]" value={labelId} />
	{/each}
	<input type="submit" value={t('admin.action.update')} class="btn btn-blue self-start" />
</form>
