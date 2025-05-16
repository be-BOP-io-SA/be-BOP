<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	const { t, sortedCountryCodes, countryName } = useI18n();

	let country = data.personalInfoConnected?.address?.country ?? 'CH';
</script>

<main class="mx-auto max-w-7xl py-10 px-6 body-mainPlan">
	<div class="w-full rounded-xl body-mainPlan border-gray-300 p-6 md:grid gap-4 md:gap-2 flex">
		<form method="post" class="col-span-2 flex gap-4 flex-col">
			<section class="gap-4 grid grid-cols-6 w-4/5">
				<h1 class="font-light text-2xl col-span-6">{t('identity.personalInformation')}</h1>

				<label class="form-label col-span-3">
					{t('address.firstName')}
					<input
						type="text"
						class="form-input"
						name="firstName"
						autocomplete="given-name"
						required
						value={data.personalInfoConnected?.firstName ?? ''}
					/>
				</label>

				<label class="form-label col-span-3">
					{t('address.lastName')}
					<input
						type="text"
						class="form-input"
						name="lastName"
						autocomplete="family-name"
						required
						value={data.personalInfoConnected?.lastName ?? ''}
					/>
				</label>

				<label class="form-label col-span-6">
					{t('address.address')}
					<input
						type="text"
						class="form-input"
						autocomplete="street-address"
						name="address.street"
						required
						value={data.personalInfoConnected?.address?.street ?? ''}
					/>
				</label>

				<label class="form-label col-span-3">
					{t('address.country')}
					<select name="address.country" class="form-input" required>
						{#each sortedCountryCodes() as code}
							<option value={code} selected={code === country}>{countryName(code)}</option>
						{/each}
					</select>
				</label>

				<span class="col-span-3" />

				<label class="form-label col-span-2">
					{t('address.state')}

					<input
						type="text"
						name="address.state"
						class="form-input"
						value={data.personalInfoConnected?.address?.state ?? ''}
					/>
				</label>
				<label class="form-label col-span-2">
					{t('address.city')}

					<input
						type="text"
						name="address.city"
						class="form-input"
						required
						value={data.personalInfoConnected?.address?.city ?? ''}
					/>
				</label>
				<label class="form-label col-span-2">
					{t('address.zipCode')}

					<input
						type="text"
						name="address.zip"
						class="form-input"
						required
						autocomplete="postal-code"
						value={data.personalInfoConnected?.address?.zip ?? ''}
					/>
				</label>
				{#if data.contactModes.includes('email')}
					<label class="form-label col-span-3">
						{t('checkout.notifications.email')}
						<input
							type="email"
							name="email"
							class="form-input"
							placeholder={data.email || ''}
							value={data.personalInfoConnected?.email || ''}
						/>
					</label>
				{/if}
				<label
					class="form-label {!data.contactModes.includes('email') ? 'col-span-6' : 'col-span-3'}"
				>
					{t('checkout.notifications.npub')}

					<input
						type="text"
						name="npub"
						class="form-input"
						placeholder={data.npub || ''}
						value={data.personalInfoConnected?.npub || ''}
						pattern="^(?!nsec).*"
						title={t('login.nsecBlockTitle')}
					/>
				</label>
				{#if data.displayNewsletterCommercialProspection}
					<label class="checkbox-label col-span-3">
						<input
							class="form-checkbox"
							type="checkbox"
							checked={data.personalInfoConnected?.newsletter?.seller ?? false}
							name="newsletter.seller"
						/>
						{t('newsletter.allowSellerContact')}
					</label>
					<label class="checkbox-label col-span-3">
						<input
							class="form-checkbox"
							type="checkbox"
							checked={data.personalInfoConnected?.newsletter?.partner ?? false}
							name="newsletter.partner"
						/>
						{t('newsletter.allowPartnerContact')}
					</label>
				{/if}
				<input
					type="submit"
					class="btn btn-black self-start p-1"
					value={t('identity.cta.update')}
				/>
			</section>
		</form>
	</div>
</main>
