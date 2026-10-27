<script lang="ts">
	import IconRefresh from '$lib/components/icons/IconRefresh.svelte';
	import IconSave from '~icons/ant-design/save-outlined';
	import IconDelete from '~icons/ant-design/delete-outlined';
	import { POS_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
	import { applyAction, enhance } from '$app/forms';
	import { MultiSelect } from 'svelte-multiselect';
	import { defaultRoleOptions } from '$lib/types/Role';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	function blurActiveElement() {
		if (document.activeElement?.tagName === 'INPUT') {
			(document.activeElement as HTMLInputElement).blur();
		}
	}

	let successMessage = '';
	let listEmail = data.users.flatMap((user) => user.recovery?.email ?? '');
	let listNpub = data.users.flatMap((user) => user.recovery?.npub ?? '');
	function hasDuplicates(list: string[]) {
		let uniqueSet = new Set(list.filter((recover) => recover));
		return uniqueSet.size !== list.filter((recover) => recover).length;
	}
</script>

<h1 class="text-3xl">{t('admin.arm.title')}</h1>

{#if successMessage}
	<div class="alert alert-success">{successMessage}</div>
{/if}

<h2 class="text-2xl">{t('admin.arm.roles')}</h2>

<a href="{data.adminPrefix}/arm/role/new" class="underline">{t('admin.arm.createRole')}</a>

<ul class="grid grid-cols-[auto_auto_auto_auto_auto__auto_min-content_min-content] gap-2">
	<li class="contents">
		<span>{t('admin.arm.roleId')}</span>
		<span>{t('admin.arm.roleName')}</span>
		<span>{t('admin.arm.pos')}</span>
		<span>{t('admin.arm.writeAccess')}</span>
		<span>{t('admin.arm.readAccess')}</span>
		<span>{t('admin.arm.forbiddenAccess')}</span>
		<span>{t('admin.action.save')}</span>
		<span>{t('admin.arm.delete')}</span>
	</li>
	{#each data.roles as role}
		<li class="contents">
			<form
				class="contents"
				method="post"
				action="{data.adminPrefix}/arm/role/{role._id}?/update"
				use:enhance={({ action }) => {
					return async ({ result }) => {
						if (result.type === 'error') {
							return await applyAction(result);
						}

						if (action.searchParams.has('/update')) {
							successMessage = t('admin.arm.roleUpdated', { id: role._id });
							blurActiveElement();
							window.location.reload();
						} else {
							await applyAction(result);
						}
					};
				}}
			>
				<input type="text" name="id" class="form-input" disabled value={role._id} />
				<input
					type="text"
					name="name"
					class="form-input"
					value={role.name}
					readonly={role._id === SUPER_ADMIN_ROLE_ID}
				/>
				<input
					class="form-checkbox place-self-center"
					type="checkbox"
					name="hasPosOptions"
					checked={role.hasPosOptions || role._id === POS_ROLE_ID}
					disabled={role._id === POS_ROLE_ID}
				/>
				<MultiSelect
					--sms-options-bg="var(--body-mainPlan-backgroundColor)"
					name="write"
					selected={role.permissions.write}
					options={defaultRoleOptions}
					disabled={role._id === SUPER_ADMIN_ROLE_ID}
					allowUserOptions
				/>
				<MultiSelect
					--sms-options-bg="var(--body-mainPlan-backgroundColor)"
					name="read"
					selected={role.permissions.read}
					options={defaultRoleOptions}
					disabled={role._id === SUPER_ADMIN_ROLE_ID}
					allowUserOptions
				/>
				<MultiSelect
					--sms-options-bg="var(--body-mainPlan-backgroundColor)"
					name="forbidden"
					selected={role.permissions.forbidden}
					options={defaultRoleOptions}
					allowUserOptions
					disabled={role._id === SUPER_ADMIN_ROLE_ID}
				/>
				<button type="submit" class="btn btn-black self-start" title={t('admin.action.save')}>
					<IconSave />
				</button>
				<button
					type="submit"
					class="btn btn-red self-start"
					formaction="{data.adminPrefix}/arm/role/{role._id}?/delete"
					disabled={role._id === SUPER_ADMIN_ROLE_ID}
					title={t('admin.arm.deleteRole')}
					on:click={(e) => {
						if (!confirm(t('admin.arm.confirmDeleteRole', { id: role._id }))) {
							e.preventDefault();
						}
					}}
				>
					<IconDelete />
				</button>
			</form>
		</li>
	{/each}
</ul>

<h2 class="text-2xl">{t('admin.arm.users')}</h2>
{#if hasDuplicates(listEmail)}
	<span class="text-red-500">{t('admin.arm.duplicateEmails')}</span>
{/if}
{#if hasDuplicates(listNpub)}
	<span class="text-red-500">{t('admin.arm.duplicateNpubs')}</span>
{/if}
<a href="{data.adminPrefix}/arm/user/new" class="underline">{t('admin.arm.createUser')}</a>

<ul
	class="grid grid-cols-[auto_auto_auto_auto_auto_min-content_auto_min-content_min-content_min-content] gap-2"
>
	<li class="contents">
		<span>{t('admin.arm.login')}</span>
		<span>{t('admin.arm.alias')}</span>
		<span>{t('admin.arm.recoveryEmail')}</span>
		<span>{t('admin.arm.recoveryNpub')}</span>
		<span>{t('admin.arm.role')}</span>
		<span>{t('admin.arm.pos')}</span>
		<span>{t('admin.arm.status')}</span>
		<span>{t('admin.action.save')}</span>
		<span>{t('admin.arm.password')}</span>
		<span>{t('admin.arm.delete')}</span>
	</li>
	{#each data.users as user, i}
		<li class="contents">
			<form
				action="{data.adminPrefix}/arm/user/{user._id}?/update"
				method="post"
				class="contents"
				use:enhance={({ action }) => {
					return async ({ result }) => {
						if (result.type === 'error') {
							return await applyAction(result);
						}

						if (action.searchParams.has('/resetPassword')) {
							successMessage = t('admin.arm.passwordReset', { login: user.login });
						} else if (action.searchParams.has('/update')) {
							successMessage = t('admin.arm.accountUpdated', { login: user.login });
							blurActiveElement();
							window.location.reload();
						} else {
							await applyAction(result);
						}
					};
				}}
			>
				<input
					type="text"
					name="login"
					class="form-input"
					value={user.login}
					disabled={data.roleId !== SUPER_ADMIN_ROLE_ID && user.roleId === SUPER_ADMIN_ROLE_ID}
				/>
				<input
					type="text"
					name="alias"
					class="form-input"
					value={user.alias ?? ''}
					disabled={data.roleId !== SUPER_ADMIN_ROLE_ID && user.roleId === SUPER_ADMIN_ROLE_ID}
				/>
				<input
					type="email"
					name="recoveryEmail"
					class="form-input"
					disabled={data.roleId !== SUPER_ADMIN_ROLE_ID && user.roleId === SUPER_ADMIN_ROLE_ID}
					bind:value={listEmail[i]}
				/>
				<input
					type="text"
					name="recoveryNpub"
					class="form-input"
					disabled={data.roleId !== SUPER_ADMIN_ROLE_ID && user.roleId === SUPER_ADMIN_ROLE_ID}
					bind:value={listNpub[i]}
				/>
				<select class="form-input" disabled={user.roleId === SUPER_ADMIN_ROLE_ID} name="roleId">
					{#each data.roles as role}
						<option
							value={role._id}
							selected={role._id === user.roleId}
							disabled={role._id === SUPER_ADMIN_ROLE_ID}
						>
							{role.name}
						</option>
					{/each}
				</select>
				{#if user.roleId === SUPER_ADMIN_ROLE_ID}
					<input type="hidden" name="roleId" value={SUPER_ADMIN_ROLE_ID} />
				{/if}
				<input
					class="form-checkbox place-self-center"
					type="checkbox"
					name="hasPosOptions"
					bind:checked={user.hasPosOptions}
					disabled={data.roles.find((rol) => rol._id === user.roleId)?.hasPosOptions}
				/>
				<select class="form-input" disabled={user.roleId === SUPER_ADMIN_ROLE_ID} name="status">
					<option value="enabled" selected={!user.disabled}>{t('admin.arm.enabled')}</option>
					<option value="disabled" selected={!!user.disabled}>{t('admin.arm.disabled')}</option>
				</select>
				<button
					type="submit"
					class="btn btn-black self-start"
					title={t('admin.action.save')}
					disabled={hasDuplicates(listEmail) || hasDuplicates(listNpub)}
				>
					<IconSave />
				</button>
				<button
					type="submit"
					class="btn btn-red self-start"
					formaction="{data.adminPrefix}/arm/user/{user._id}?/resetPassword"
					disabled={user.roleId === SUPER_ADMIN_ROLE_ID}
					title={t('admin.arm.resetPassword')}
				>
					<IconRefresh />
				</button>
				<button
					type="submit"
					class="btn btn-red self-start"
					formaction="{data.adminPrefix}/arm/user/{user._id}?/delete"
					disabled={user.roleId === SUPER_ADMIN_ROLE_ID}
					title={t('admin.arm.deleteAccount')}
					on:click={(e) => {
						if (!confirm(t('admin.arm.confirmDeleteAccount', { login: user.login }))) {
							e.preventDefault();
						}
					}}
				>
					<IconDelete />
				</button>
			</form>
		</li>
	{/each}
</ul>

<h2 class="text-2xl">{t('admin.arm.welcomeMessageTitle')}</h2>
<form
	action="{data.adminPrefix}/arm?/updateWelcomeMessage"
	method="post"
	class="contents"
	use:enhance={({ action }) => {
		return async ({ result }) => {
			if (result.type === 'error') {
				return await applyAction(result);
			}
			if (action.searchParams.has('/updateWelcomeMessage')) {
				successMessage = t('admin.arm.welcomeMessageUpdated');
			} else {
				await applyAction(result);
			}
		};
	}}
>
	<label class="form-label">
		{t('admin.arm.message')}
		<textarea
			name="welcomMessage"
			cols="30"
			rows="8"
			placeholder={t('admin.arm.welcomeMessagePlaceholder')}
			maxlength="4096"
			class="form-input block w-full"
			value={data.adminWelcomMessage}
		/>
	</label>
	<button type="submit" class="btn body-mainCTA self-start"> {t('admin.arm.saveText')} </button>
</form>
