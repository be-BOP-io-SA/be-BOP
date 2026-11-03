<script lang="ts">
	import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	let npub = '';
</script>

<h1 class="text-3xl">{t('admin.arm.createUserTitle')}</h1>

<form method="post" class="flex flex-col gap-6">
	<label class="form-label">
		{t('admin.arm.role')}
		<select class="form-input" name="roleId" required>
			{#each data.roles as role}
				<option value={role._id} disabled={role._id === SUPER_ADMIN_ROLE_ID}>{role.name}</option>
			{/each}
		</select>
	</label>
	<label class="form-label">
		{t('admin.arm.login')}
		<input class="form-input" type="text" name="login" placeholder="user" required />
	</label>
	<label class="form-label">
		{t('admin.arm.alias')}
		<input class="form-input" type="text" name="alias" placeholder="alias" />
	</label>
	<label class="form-label">
		{t('admin.arm.recoveryEmail')}
		<input
			class="form-input"
			type="email"
			name="email"
			required={!npub}
			placeholder="user@{$page.url.hostname}"
		/>
	</label>
	<label class="form-label">
		{t('admin.arm.recoveryNpub')}
		<input
			class="form-input"
			type="npub"
			name="npub"
			bind:value={npub}
			placeholder="npub1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
		/>
	</label>
	<input type="submit" value={t('admin.arm.create')} class="btn btn-black self-start" />
</form>
