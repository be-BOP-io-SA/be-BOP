<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = {
		settings: {
			fields: {
				clientId: {
					label: tr('admin.paypal.clientId', {
						en: 'Client ID',
						fr: 'Identifiant client',
						de: 'Client-ID',
						'es-sv': 'ID de cliente',
						it: 'ID cliente',
						nl: 'Client-ID',
						pt: 'ID do cliente'
					})
				},
				secret: {
					label: tr('admin.paypal.secret', {
						en: 'Secret',
						fr: 'Clé secrète',
						de: 'Geheimnis',
						'es-sv': 'Clave secreta',
						it: 'Segreto',
						nl: 'Geheime sleutel',
						pt: 'Segredo'
					})
				},
				sandbox: {
					label: tr('admin.paypal.sandboxCredentials', {
						en: 'Those credentials are for the sandbox environment',
						fr: "Ces identifiants sont destinés à l'environnement de test (sandbox)",
						de: 'Diese Zugangsdaten sind für die Sandbox-Umgebung',
						'es-sv': 'Estas credenciales son para el entorno de pruebas (sandbox)',
						it: "Queste credenziali sono per l'ambiente sandbox",
						nl: 'Deze gegevens zijn voor de sandbox-omgeving',
						pt: 'Estas credenciais são para o ambiente sandbox'
					})
				},
				currency: {
					label: tr('admin.paypal.currency', {
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
