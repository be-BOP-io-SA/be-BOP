<script context="module" lang="ts">
	import { tr, type Front } from '../front';
	import type declaration from './declaration';

	export const front: Front<typeof declaration> = {
		settings: {
			fields: {
				integrationKey: {
					label: tr('admin.sattleme.integrationKey', {
						en: 'Integration key (sattle.me app > Integrations)',
						fr: 'Clé d’intégration (app sattle.me > Intégrations)',
						de: 'Integrationsschlüssel (sattle.me-App > Integrationen)',
						'es-sv': 'Clave de integración (app sattle.me > Integraciones)',
						it: 'Chiave di integrazione (app sattle.me > Integrazioni)',
						nl: 'Integratiesleutel (sattle.me-app > Integraties)',
						pt: 'Chave de integração (app sattle.me > Integrações)'
					})
				},
				onchain: {
					label: tr('admin.sattleme.onchain', {
						en: 'Also take on-chain payments (Bitcoin method)',
						fr: 'Accepter aussi les paiements on-chain (méthode Bitcoin)',
						de: 'Auch On-Chain-Zahlungen annehmen (Methode Bitcoin)',
						'es-sv': 'Aceptar también pagos on-chain (método Bitcoin)',
						it: 'Accetta anche pagamenti on-chain (metodo Bitcoin)',
						nl: 'Ook on-chain betalingen aannemen (methode Bitcoin)',
						pt: 'Aceitar também pagamentos on-chain (método Bitcoin)'
					})
				}
			},
			outro: tr('admin.sattleme.outro', {
				en: 'Payments go straight to the merchant’s wallet. Create one integration per shop and keep its key secret. Lightning and on-chain are offered as two methods, each with a QR code of its own; on-chain payments are paid at 3 confirmations, and each invoice lasts one hour at most. To make sattle.me take a method another processor serves, prefer it in Settings > General.',
				fr: 'Les paiements vont directement dans le portefeuille du marchand. Créez une intégration par boutique et gardez sa clé secrète. Lightning et on-chain sont proposés comme deux méthodes, chacune avec son propre QR code ; les paiements on-chain sont payés à 3 confirmations, et chaque facture dure au plus une heure. Pour que sattle.me prenne une méthode servie par un autre processeur, préférez-le dans Paramètres > Général.',
				de: 'Zahlungen gehen direkt in die Wallet des Händlers. Erstellen Sie eine Integration pro Shop und halten Sie ihren Schlüssel geheim. Lightning und On-Chain werden als zwei Methoden mit je eigenem QR-Code angeboten; On-Chain-Zahlungen gelten nach 3 Bestätigungen als bezahlt, und jede Rechnung gilt höchstens eine Stunde. Damit sattle.me eine Methode übernimmt, die ein anderer Anbieter bedient, bevorzugen Sie es unter Einstellungen > Allgemein.',
				'es-sv':
					'Los pagos van directamente a la billetera del comerciante. Cree una integración por tienda y mantenga su clave en secreto. Lightning y on-chain se ofrecen como dos métodos, cada uno con su propio código QR; los pagos on-chain se consideran pagados con 3 confirmaciones, y cada factura dura una hora como máximo. Para que sattle.me atienda un método que sirve otro procesador, prefiéralo en Ajustes > General.',
				it: 'I pagamenti vanno direttamente nel portafoglio del commerciante. Create un’integrazione per negozio e tenetene segreta la chiave. Lightning e on-chain sono proposti come due metodi, ciascuno con il proprio codice QR; i pagamenti on-chain risultano pagati a 3 conferme, e ogni fattura dura al massimo un’ora. Perché sattle.me prenda un metodo servito da un altro processore, preferitelo in Impostazioni > Generale.',
				nl: 'Betalingen gaan rechtstreeks naar de wallet van de handelaar. Maak één integratie per winkel en houd de sleutel geheim. Lightning en on-chain worden als twee methoden aangeboden, elk met een eigen QR-code; on-chain betalingen gelden als betaald na 3 bevestigingen, en elke factuur geldt hoogstens een uur. Wilt u dat sattle.me een methode overneemt die een andere verwerker bedient, geef er dan de voorkeur aan in Instellingen > Algemeen.',
				pt: 'Os pagamentos vão diretamente para a carteira do comerciante. Crie uma integração por loja e mantenha a chave em segredo. Lightning e on-chain são oferecidos como dois métodos, cada um com o seu próprio código QR; os pagamentos on-chain contam como pagos com 3 confirmações, e cada fatura dura no máximo uma hora. Para que o sattle.me atenda um método servido por outro processador, prefira-o em Definições > Geral.'
			})
		}
	};
</script>
