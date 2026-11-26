<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = {
		settings: {
			fields: {
				shopId: {
					label: tr('admin.osb.shopId', {
						en: 'Shop ID',
						fr: 'ID de la boutique',
						de: 'Shop-ID',
						'es-sv': 'ID de la tienda',
						it: 'ID negozio',
						nl: 'Winkel-ID',
						pt: 'ID da loja'
					})
				},
				password: {
					label: tr('admin.osb.restApiPassword', {
						en: 'REST API Password',
						fr: 'Mot de passe API REST',
						de: 'REST-API-Passwort',
						'es-sv': 'Contraseña de la API REST',
						it: 'Password API REST',
						nl: 'REST API-wachtwoord',
						pt: 'Senha da API REST'
					})
				},
				hmacKey: {
					label: tr('admin.osb.hmacKeyOptional', {
						en: 'HMAC-SHA-256 Key (optional)',
						fr: 'Clé HMAC-SHA-256 (optionnelle)',
						de: 'HMAC-SHA-256-Schlüssel (optional)',
						'es-sv': 'Clave HMAC-SHA-256 (opcional)',
						it: 'Chiave HMAC-SHA-256 (opzionale)',
						nl: 'HMAC-SHA-256-sleutel (optioneel)',
						pt: 'Chave HMAC-SHA-256 (opcional)'
					})
				}
			},
			outro: tr('admin.osb.currencyFixed', {
				en: 'Currency: XPF (fixed)',
				fr: 'Devise : XPF (fixe)',
				de: 'Währung: XPF (fest)',
				'es-sv': 'Moneda: XPF (fija)',
				it: 'Valuta: XPF (fissa)',
				nl: 'Valuta: XPF (vast)',
				pt: 'Moeda: XPF (fixa)'
			})
		}
	};
</script>
