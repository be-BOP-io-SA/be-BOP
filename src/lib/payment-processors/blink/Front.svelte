<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = { settings: 'custom' };

	const text = {
		intro: tr('admin.blink.intro', {
			en: 'Receive Lightning payments into your Blink account. Configure <0>one</0> of the two options below. A Lightning address needs no API key and works for both custodial Blink accounts and self-custodial (Spark) addresses. Only BTC wallets are supported.',
			fr: "Recevez des paiements Lightning sur votre compte Blink. Configurez <0>l'une</0> des deux options ci-dessous. Une adresse Lightning ne nécessite aucune clé API et fonctionne aussi bien pour les comptes Blink dépositaires que pour les adresses auto-dépositaires (Spark). Seuls les portefeuilles BTC sont pris en charge.",
			de: 'Empfangen Sie Lightning-Zahlungen auf Ihrem Blink-Konto. Konfigurieren Sie <0>eine</0> der beiden folgenden Optionen. Eine Lightning-Adresse benötigt keinen API-Schlüssel und funktioniert sowohl für verwahrte Blink-Konten als auch für selbstverwahrte (Spark) Adressen. Es werden nur BTC-Wallets unterstützt.',
			'es-sv':
				'Reciba pagos Lightning en su cuenta Blink. Configure <0>una</0> de las dos opciones siguientes. Una dirección Lightning no requiere clave API y funciona tanto para cuentas Blink custodiadas como para direcciones autocustodiadas (Spark). Solo se admiten billeteras BTC.',
			it: 'Ricevi pagamenti Lightning sul tuo account Blink. Configura <0>una</0> delle due opzioni seguenti. Un indirizzo Lightning non richiede alcuna chiave API e funziona sia per gli account Blink in custodia sia per gli indirizzi auto-custoditi (Spark). Sono supportati solo i wallet BTC.',
			nl: 'Ontvang Lightning-betalingen op uw Blink-account. Configureer <0>een</0> van de twee onderstaande opties. Een Lightning-adres heeft geen API-sleutel nodig en werkt zowel voor beheerde Blink-accounts als voor zelfbeheerde (Spark) adressen. Alleen BTC-wallets worden ondersteund.',
			pt: 'Receba pagamentos Lightning na sua conta Blink. Configure <0>uma</0> das duas opções abaixo. Um endereço Lightning não necessita de chave API e funciona tanto para contas Blink com custódia como para endereços de autocustódia (Spark). Apenas as carteiras BTC são suportadas.'
		}),
		option1Title: tr('admin.blink.option1Title', {
			en: 'Option 1 — Lightning address (no API key)',
			fr: 'Option 1 — adresse Lightning (sans clé API)',
			de: 'Option 1 — Lightning-Adresse (ohne API-Schlüssel)',
			'es-sv': 'Opción 1 — dirección Lightning (sin clave API)',
			it: 'Opzione 1 — indirizzo Lightning (senza chiave API)',
			nl: 'Optie 1 — Lightning-adres (geen API-sleutel)',
			pt: 'Opção 1 — endereço Lightning (sem chave API)'
		}),
		lnAddress: tr('admin.blink.lnAddress', {
			en: 'Lightning address',
			fr: 'Adresse Lightning',
			de: 'Lightning-Adresse',
			'es-sv': 'Dirección Lightning',
			it: 'Indirizzo Lightning',
			nl: 'Lightning-adres',
			pt: 'Endereço Lightning'
		}),
		option2Title: tr('admin.blink.option2Title', {
			en: 'Option 2 — API key (custodial account)',
			fr: 'Option 2 — clé API (compte dépositaire)',
			de: 'Option 2 — API-Schlüssel (verwahrtes Konto)',
			'es-sv': 'Opción 2 — clave API (cuenta custodiada)',
			it: 'Opzione 2 — chiave API (account in custodia)',
			nl: 'Optie 2 — API-sleutel (beheerd account)',
			pt: 'Opção 2 — chave API (conta com custódia)'
		}),
		apiKey: tr('admin.blink.apiKey', {
			en: 'API Key',
			fr: 'Clé API',
			de: 'API-Schlüssel',
			'es-sv': 'Clave API',
			it: 'Chiave API',
			nl: 'API-sleutel',
			pt: 'Chave API'
		}),
		walletId: tr('admin.blink.walletId', {
			en: "Wallet ID (optional — defaults to your account's default BTC wallet)",
			fr: 'ID de portefeuille (facultatif — par défaut, le portefeuille BTC par défaut de votre compte)',
			de: 'Wallet-ID (optional — standardmäßig das Standard-BTC-Wallet Ihres Kontos)',
			'es-sv':
				'ID de billetera (opcional — por defecto, la billetera BTC predeterminada de su cuenta)',
			it: 'ID wallet (facoltativo — per impostazione predefinita, il wallet BTC predefinito del tuo account)',
			nl: 'Wallet-ID (optioneel — standaard de standaard-BTC-wallet van uw account)',
			pt: 'ID da carteira (opcional — por predefinição, a carteira BTC predefinida da sua conta)'
		})
	};
</script>

<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let config: { apiKey: string; lnAddress: string; walletId: string };

	const { tInline } = useI18n();

	// The text marks the word to stress, as translations of the app do: `<0>one</0>`.
	const [introStart, introStressed, introEnd] = tInline(text.intro).split(/<\/?0>/);
</script>

<p class="text-sm">
	{introStart}{#if introStressed}<strong>{introStressed}</strong>{/if}{introEnd ?? ''}
</p>

<h2 class="text-2xl">{tInline(text.option1Title)}</h2>
<label class="form-label">
	{tInline(text.lnAddress)}
	<input
		class="form-input"
		type="text"
		name="lnAddress"
		placeholder="you@blink.sv"
		value={config.lnAddress}
	/>
</label>

<h2 class="text-2xl">{tInline(text.option2Title)}</h2>
<label class="form-label">
	{tInline(text.apiKey)}
	<input
		class="form-input"
		type="password"
		name="apiKey"
		placeholder="blink_..."
		value={config.apiKey}
	/>
</label>
<label class="form-label">
	{tInline(text.walletId)}
	<input class="form-input" type="text" name="walletId" value={config.walletId} />
</label>
