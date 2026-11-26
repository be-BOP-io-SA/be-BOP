<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = {
		settings: {
			fields: {
				apiKey: {
					label: tr('admin.swissBitcoinPay.apiKey', {
						en: 'API Key',
						fr: 'Clé API',
						de: 'API-Schlüssel',
						'es-sv': 'Clave API',
						it: 'Chiave API',
						nl: 'API-sleutel',
						pt: 'Chave API'
					})
				}
			}
		}
	};
</script>
