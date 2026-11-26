<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = {
		settings: {
			fields: {
				backendUrl: {
					label: tr('admin.taler.backendUrl', {
						en: 'Backend URL',
						fr: 'URL du backend',
						de: 'Backend-URL',
						'es-sv': 'URL del backend',
						it: 'URL del backend',
						nl: 'Backend-URL',
						pt: 'URL do backend'
					})
				},
				backendApiKey: {
					label: tr('admin.taler.backendApiKey', {
						en: 'Backend API Key',
						fr: 'Clé API du backend',
						de: 'Backend-API-Schlüssel',
						'es-sv': 'Clave API del backend',
						it: 'Chiave API del backend',
						nl: 'Backend-API-sleutel',
						pt: 'Chave de API do backend'
					})
				},
				currency: {
					label: tr('admin.taler.currency', {
						en: 'Currency',
						fr: 'Devise',
						de: 'Währung',
						'es-sv': 'Moneda',
						it: 'Valuta',
						nl: 'Valuta',
						pt: 'Moeda'
					})
				}
			}
		}
	};
</script>
