<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = { settings: 'custom' };

	const text = {
		serverUrl: tr('admin.btcpayServer.serverUrl', {
			en: 'Server URL',
			fr: 'URL du serveur',
			de: 'Server-URL',
			'es-sv': 'URL del servidor',
			it: 'URL del server',
			nl: 'Server-URL',
			pt: 'URL do servidor'
		}),
		serverUrlPlaceholder: tr('admin.btcpayServer.serverUrlPlaceholder', {
			en: 'e.g. https://mainnet.demo.btcpayserver.org',
			fr: 'p. ex. https://mainnet.demo.btcpayserver.org',
			de: 'z. B. https://mainnet.demo.btcpayserver.org',
			'es-sv': 'ej. https://mainnet.demo.btcpayserver.org',
			it: 'es. https://mainnet.demo.btcpayserver.org',
			nl: 'bijv. https://mainnet.demo.btcpayserver.org',
			pt: 'ex. https://mainnet.demo.btcpayserver.org'
		}),
		storeId: tr('admin.btcpayServer.storeId', {
			en: 'Store ID',
			fr: 'ID de la boutique',
			de: 'Store-ID',
			'es-sv': 'ID de la tienda',
			it: 'ID del negozio',
			nl: 'Winkel-ID',
			pt: 'ID da loja'
		}),
		storeIdPlaceholder: tr('admin.btcpayServer.storeIdPlaceholder', {
			en: 'e.g. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			fr: 'p. ex. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			de: 'z. B. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			'es-sv': 'ej. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			it: 'es. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			nl: 'bijv. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ',
			pt: 'ex. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ'
		}),
		lightningWarningPrefix: tr('admin.btcpayServer.lightningWarningPrefix', {
			en: 'Please make sure to enable lightning in',
			fr: "Veuillez vous assurer d'activer lightning dans",
			de: 'Bitte stellen Sie sicher, dass Lightning aktiviert ist in',
			'es-sv': 'Asegúrese de habilitar lightning en',
			it: 'Assicurati di abilitare lightning in',
			nl: 'Zorg ervoor dat u lightning inschakelt in',
			pt: 'Certifique-se de ativar o lightning em'
		}),
		ariaLightningSettings: tr('admin.btcpayServer.ariaLightningSettings', {
			en: 'Lightning settings in your BTCPay Server store',
			fr: 'Paramètres lightning dans votre boutique BTCPay Server',
			de: 'Lightning-Einstellungen in Ihrem BTCPay Server Store',
			'es-sv': 'Configuración de lightning en su tienda BTCPay Server',
			it: 'Impostazioni lightning nel tuo negozio BTCPay Server',
			nl: 'Lightning-instellingen in uw BTCPay Server-winkel',
			pt: 'Configurações de lightning na sua loja BTCPay Server'
		}),
		storeSettingsLink: tr('admin.btcpayServer.storeSettingsLink', {
			en: 'your store settings',
			fr: 'les paramètres de votre boutique',
			de: 'den Einstellungen Ihres Stores',
			'es-sv': 'la configuración de su tienda',
			it: 'le impostazioni del tuo negozio',
			nl: 'uw winkelinstellingen',
			pt: 'as configurações da sua loja'
		}),
		lightningLinkFallbackStore: tr('admin.btcpayServer.lightningLinkFallbackStore', {
			en: 'If the link above does not work, check the provided Server URL and Store ID.',
			fr: "Si le lien ci-dessus ne fonctionne pas, vérifiez l'URL du serveur et l'ID de la boutique fournis.",
			de: 'Wenn der obige Link nicht funktioniert, überprüfen Sie die angegebene Server-URL und Store-ID.',
			'es-sv':
				'Si el enlace anterior no funciona, verifique la URL del servidor y el ID de la tienda proporcionados.',
			it: "Se il link sopra non funziona, controlla l'URL del server e l'ID del negozio forniti.",
			nl: 'Als de bovenstaande link niet werkt, controleer dan de opgegeven server-URL en winkel-ID.',
			pt: 'Se o link acima não funcionar, verifique a URL do servidor e o ID da loja fornecidos.'
		}),
		apiKey: tr('admin.btcpayServer.apiKey', {
			en: 'API Key',
			fr: 'Clé API',
			de: 'API-Schlüssel',
			'es-sv': 'Clave API',
			it: 'Chiave API',
			nl: 'API-sleutel',
			pt: 'Chave API'
		}),
		apiKeyPlaceholder: tr('admin.btcpayServer.apiKeyPlaceholder', {
			en: 'e.g. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			fr: 'p. ex. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			de: 'z. B. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			'es-sv': 'ej. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			it: 'es. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			nl: 'bijv. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6',
			pt: 'ex. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6'
		}),
		apiKeyManagePrefix: tr('admin.btcpayServer.apiKeyManagePrefix', {
			en: 'You can manage your API keys in',
			fr: 'Vous pouvez gérer vos clés API dans',
			de: 'Sie können Ihre API-Schlüssel verwalten in',
			'es-sv': 'Puede administrar sus claves API en',
			it: 'Puoi gestire le tue chiavi API in',
			nl: 'U kunt uw API-sleutels beheren in',
			pt: 'Você pode gerenciar suas chaves API em'
		}),
		accountSettingsLink: tr('admin.btcpayServer.accountSettingsLink', {
			en: 'your account settings',
			fr: 'les paramètres de votre compte',
			de: 'den Einstellungen Ihres Kontos',
			'es-sv': 'la configuración de su cuenta',
			it: 'le impostazioni del tuo account',
			nl: 'uw accountinstellingen',
			pt: 'as configurações da sua conta'
		}),
		apiKeyPermissionsPrefix: tr('admin.btcpayServer.apiKeyPermissionsPrefix', {
			en: 'Please make sure to include the',
			fr: "Veuillez vous assurer d'inclure les",
			de: 'Bitte stellen Sie sicher, dass Sie die',
			'es-sv': 'Asegúrese de incluir los',
			it: 'Assicurati di includere i',
			nl: 'Zorg ervoor dat u de',
			pt: 'Certifique-se de incluir as'
		}),
		apiKeyPermissionsMiddle: tr('admin.btcpayServer.apiKeyPermissionsMiddle', {
			en: 'and',
			fr: 'et',
			de: 'und',
			'es-sv': 'y',
			it: 'e',
			nl: 'en',
			pt: 'e'
		}),
		apiKeyPermissionsSuffix: tr('admin.btcpayServer.apiKeyPermissionsSuffix', {
			en: 'permissions.',
			fr: 'autorisations.',
			de: 'Berechtigungen einschließen.',
			'es-sv': 'permisos.',
			it: 'autorizzazioni.',
			nl: 'machtigingen opneemt.',
			pt: 'permissões.'
		}),
		apiKeyLinkFallback: tr('admin.btcpayServer.apiKeyLinkFallback', {
			en: 'If the link above does not work, check the provided Server URL.',
			fr: "Si le lien ci-dessus ne fonctionne pas, vérifiez l'URL du serveur fournie.",
			de: 'Wenn der obige Link nicht funktioniert, überprüfen Sie die angegebene Server-URL.',
			'es-sv': 'Si el enlace anterior no funciona, verifique la URL del servidor proporcionada.',
			it: "Se il link sopra non funziona, controlla l'URL del server fornito.",
			nl: 'Als de bovenstaande link niet werkt, controleer dan de opgegeven server-URL.',
			pt: 'Se o link acima não funcionar, verifique a URL do servidor fornecida.'
		})
	};
</script>

<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let config: { serverUrl: string; storeId: string; apiKey: string };

	const { tInline } = useI18n();

	// Deep links into the operator's own BTCPay instance, rebuilt as they type, so the two
	// settings they have to get right are one click away rather than described in prose.
	$: base = config.serverUrl && config.serverUrl.replace(/\/\s*$/, '').trim();
	$: accountSettingsUrl = base && `${base}/account/apikeys`;
	$: storeSettingsUrl =
		base && config.storeId && `${base}/stores/${config.storeId.trim()}/lightning/BTC/settings`;
</script>

<label class="form-label">
	{tInline(text.serverUrl)}
	<input
		class="form-input"
		type="url"
		name="serverUrl"
		placeholder={tInline(text.serverUrlPlaceholder)}
		bind:value={config.serverUrl}
		required
	/>
</label>
<label class="form-label">
	{tInline(text.storeId)}
	<input
		class="form-input"
		type="text"
		name="storeId"
		placeholder={tInline(text.storeIdPlaceholder)}
		bind:value={config.storeId}
		required
	/>
</label>
{#if storeSettingsUrl}
	<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
		<p class="text-yellow-800">
			{tInline(text.lightningWarningPrefix)}
			<a
				href={storeSettingsUrl}
				class="body-hyperlink underline"
				target="_blank"
				rel="external noopener"
				aria-label={tInline(text.ariaLightningSettings)}
			>
				{tInline(text.storeSettingsLink)}
			</a>.
			<br />{tInline(text.lightningLinkFallbackStore)}
		</p>
	</div>
{/if}
<label class="form-label">
	{tInline(text.apiKey)}
	<input
		class="form-input"
		type="password"
		name="apiKey"
		placeholder={tInline(text.apiKeyPlaceholder)}
		bind:value={config.apiKey}
		required
	/>
	{#if accountSettingsUrl}
		<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
			<p class="text-yellow-800">
				{tInline(text.apiKeyManagePrefix)}
				<a
					href={accountSettingsUrl}
					class="body-hyperlink underline"
					target="_blank"
					rel="external noopener"
					aria-label={tInline(text.ariaLightningSettings)}
				>
					{tInline(text.accountSettingsLink)}
				</a>.
				<br />{tInline(text.apiKeyPermissionsPrefix)}
				<code class="break-all">btcpay.store.cancreatelightninginvoice</code>
				{tInline(text.apiKeyPermissionsMiddle)}
				<code class="break-all">btcpay.store.canviewlightninginvoice</code>
				{tInline(text.apiKeyPermissionsSuffix)}
				<br />{tInline(text.apiKeyLinkFallback)}
			</p>
		</div>
	{/if}
</label>
