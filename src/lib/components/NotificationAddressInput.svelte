<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import type { ContactMode } from '$lib/types/ContactMode';
	import {
		contactAddressErrorKey,
		contactAddressPattern,
		parseContactAddress
	} from '$lib/utils/contactAddress';

	/** Contact modes the field accepts */
	export let modes: ContactMode[];
	export let name = 'address';
	export let value = '';
	export let required = false;
	/** Says in the label that the address may be left empty */
	export let optional = false;
	let className = 'form-label';
	export { className as class };

	const { t } = useI18n();

	let input: HTMLInputElement | null = null;
	// Until the page's JavaScript runs, the browser checks the field with `pattern`. Once it runs,
	// the field sets its own message instead: the browser would prefix it with its own text, in
	// its own language.
	let hydrated = false;
	onMount(() => (hydrated = true));

	$: acceptsEmail = modes.includes('email');
	$: acceptsNpub = modes.includes('nostr');

	function validationMessage(address: string, isRequired: boolean): string {
		if (!address.trim()) {
			return isRequired ? t('login.error.missingContactAddress') : '';
		}
		const result = parseContactAddress(address, modes);
		return 'error' in result ? t(contactAddressErrorKey(result.error)) : '';
	}

	$: input?.setCustomValidity(validationMessage(value, required));
</script>

{#if acceptsEmail || acceptsNpub}
	<label class={className}>
		{#if acceptsEmail && acceptsNpub}
			{t('checkout.notifications.emailOrNpub')}
		{:else if acceptsEmail}
			{t('checkout.notifications.email')}
		{:else}
			{t('checkout.notifications.npub')}
		{/if}
		{#if optional}{t('checkout.notifications.optional')}{/if}
		<input
			type="text"
			class="form-input"
			inputmode={acceptsNpub ? 'text' : 'email'}
			autocomplete={acceptsEmail ? 'email' : 'off'}
			{name}
			placeholder={acceptsEmail && acceptsNpub
				? 'test@example.com / npub1...'
				: acceptsEmail
				? 'test@example.com'
				: 'npub1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'}
			pattern={hydrated ? undefined : contactAddressPattern(modes)}
			bind:this={input}
			bind:value
			{required}
		/>
	</label>
{/if}
