<script lang="ts">
	import { defaultRoleOptions } from '$lib/types/Role';
	import MultiSelect from 'svelte-multiselect';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.arm.createRoleTitle')}</h1>

<form method="post" class="flex flex-col gap-6">
	<label class="form-label">
		{t('admin.arm.roleId')}
		<input class="form-input" type="text" name="id" placeholder="role-id" required />
	</label>
	<label class="form-label">
		{t('admin.arm.roleName')}
		<input
			class="form-input"
			type="text"
			name="name"
			required
			placeholder={t('admin.arm.roleName')}
		/>
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="hasPosOptions" />
		{t('admin.arm.hasPosAccess')}
	</label>
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.arm.readWriteAccess')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={defaultRoleOptions}
			allowUserOptions
			name="write"
		/>
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.arm.readAccess')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={defaultRoleOptions}
			allowUserOptions
			name="read"
		/>
	</label>

	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		{t('admin.arm.forbiddenAccess')}
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={defaultRoleOptions}
			allowUserOptions
			name="forbidden"
		/>
	</label>

	<input type="submit" value={t('admin.arm.create')} class="btn btn-black self-start" />
</form>
