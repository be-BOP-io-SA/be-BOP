<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t, locale } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.armPos.title')}</h1>

<p>{t('admin.armPos.intro')}</p>

{#if form && 'badgeIdentifier' in form && form.badgeIdentifier}
	<section class="border border-amber-400 bg-amber-50 rounded p-4 flex flex-col gap-2">
		<p class="font-semibold">{t('admin.armPos.badgeWrite')}</p>
		<code class="break-all">{form.badgeIdentifier}</code>
	</section>
{/if}

<h2 class="text-2xl">{t('admin.armPos.rolesTitle')}</h2>
<p class="text-sm">{t('admin.armPos.superAdminNote')}</p>

{#each data.roles as role}
	<form
		method="post"
		action="?/roleActions"
		class="flex flex-wrap gap-3 items-center border-b py-2"
	>
		<input type="hidden" name="roleId" value={role._id} />
		<span class="font-semibold w-40">{role.name}</span>
		{#each data.actions as action}
			<label class="checkbox-label">
				<input
					type="checkbox"
					class="form-checkbox"
					name="posActions"
					value={action}
					checked={role.posActions.includes(action)}
				/>
				{t(`admin.armPos.actions.${action}`)}
			</label>
		{/each}
		<button type="submit" class="btn btn-black ml-auto">{t('admin.action.save')}</button>
	</form>
{/each}

<h2 class="text-2xl">{t('admin.armPos.operatorsTitle')}</h2>

{#each data.users as user}
	<section class="border-b py-3 flex flex-col gap-2">
		<p class="font-semibold">
			{user.name}
			<span class="text-sm opacity-70"
				>({user.roleId}){user.disabled ? ' · ' + t('admin.armPos.disabled') : ''}</span
			>
		</p>
		<div class="flex flex-wrap gap-2 items-end">
			<form method="post" action="?/pin" class="flex gap-2 items-end">
				<input type="hidden" name="userId" value={user._id} />
				<label class="form-label">
					{user.hasPin ? t('admin.armPos.changePin') : t('admin.armPos.setPin')}
					<input
						type="password"
						name="pin"
						class="form-input"
						inputmode="numeric"
						pattern="\d{'{'}4,8{'}'}"
						autocomplete="new-password"
						required
					/>
				</label>
				<button type="submit" class="btn btn-black">{t('admin.action.save')}</button>
			</form>
			{#if user.hasPin}
				<form method="post" action="?/clearPin">
					<input type="hidden" name="userId" value={user._id} />
					<button type="submit" class="btn btn-red">{t('admin.armPos.clearPin')}</button>
				</form>
			{/if}
			<form method="post" action="?/addBadge">
				<input type="hidden" name="userId" value={user._id} />
				<button type="submit" class="btn btn-gray">{t('admin.armPos.addBadge')}</button>
			</form>
		</div>
		{#if form && 'error' in form && form.userId === user._id}
			<p class="text-red-500 text-sm">{t('admin.armPos.pinInvalid')}</p>
		{/if}
		{#each user.badges as badge}
			<div class="flex flex-wrap gap-2 items-center text-sm">
				<code>{badge.prefix}…</code>
				<span>{new Date(badge.createdAt).toLocaleDateString($locale)}</span>
				<span>{badge.suspended ? t('admin.armPos.suspended') : t('admin.armPos.active')}</span>
				<form method="post" action="?/suspendBadge">
					<input type="hidden" name="userId" value={user._id} />
					<input type="hidden" name="badgeId" value={badge._id} />
					<input type="hidden" name="suspended" value={badge.suspended ? 'false' : 'true'} />
					<button type="submit" class="underline">
						{badge.suspended ? t('admin.armPos.reactivate') : t('admin.armPos.suspend')}
					</button>
				</form>
				<form method="post" action="?/renewBadge">
					<input type="hidden" name="userId" value={user._id} />
					<input type="hidden" name="badgeId" value={badge._id} />
					<button type="submit" class="underline">{t('admin.armPos.renew')}</button>
				</form>
				<form method="post" action="?/removeBadge">
					<input type="hidden" name="userId" value={user._id} />
					<input type="hidden" name="badgeId" value={badge._id} />
					<button type="submit" class="underline text-red-500">{t('admin.armPos.remove')}</button>
				</form>
			</div>
		{/each}
	</section>
{/each}
