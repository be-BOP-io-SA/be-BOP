<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ConfirmationThresholdsForm from '$lib/payment-processors/zcash-nodeless/ConfirmationThresholdsForm.svelte';
	import { useI18n, type LocalizedText } from '$lib/i18n';

	export let data;
	export let form;

	const { t, tInline } = useI18n();
	const text = (localized: LocalizedText) => tInline({ text: localized });

	let xpub = data.zcashNodeless.xpub;
	let primaryServer = data.zcashNodeless.primaryServer;
	let backupServer = data.zcashNodeless.backupServer;
	let derivationIndex = data.zcashNodeless.derivationIndex ?? 0;
	let skipUsedAddresses = data.zcashNodeless.skipUsedAddresses ?? true;

	$: alreadySet = !!data.zcashNodeless.xpub;
	$: error =
		form && 'error' in form
			? form.error === 'invalidKey'
				? text({
						en: 'This is not a Zcash transparent account key: it starts with xpub on mainnet, tpub on testnet.',
						fr: "Ce n'est pas une clé de compte Zcash transparente : elle commence par xpub sur mainnet, tpub sur testnet.",
						de: 'Dies ist kein transparenter Zcash-Kontoschlüssel: Er beginnt mit xpub im Mainnet, tpub im Testnet.',
						'es-sv':
							'No es una clave de cuenta transparente de Zcash: empieza por xpub en mainnet y tpub en testnet.',
						it: 'Non è una chiave di conto Zcash trasparente: inizia con xpub sulla mainnet, tpub sulla testnet.',
						nl: 'Dit is geen transparante Zcash-accountsleutel: die begint met xpub op mainnet en tpub op testnet.',
						pt: 'Não é uma chave de conta Zcash transparente: começa por xpub na mainnet e tpub na testnet.'
				  })
				: form.error === 'unreachable'
				? text({
						en: 'The server {server} did not answer.',
						fr: "Le serveur {server} n'a pas répondu.",
						de: 'Der Server {server} hat nicht geantwortet.',
						'es-sv': 'El servidor {server} no respondió.',
						it: 'Il server {server} non ha risposto.',
						nl: 'De server {server} heeft niet geantwoord.',
						pt: 'O servidor {server} não respondeu.'
				  }).replace('{server}', form.server ?? '')
				: text({
						en: 'The server {server} is on another network than the key ({chainName}).',
						fr: 'Le serveur {server} est sur un autre réseau que la clé ({chainName}).',
						de: 'Der Server {server} ist in einem anderen Netz als der Schlüssel ({chainName}).',
						'es-sv': 'El servidor {server} está en otra red que la clave ({chainName}).',
						it: 'Il server {server} è su una rete diversa dalla chiave ({chainName}).',
						nl: 'De server {server} zit op een ander netwerk dan de sleutel ({chainName}).',
						pt: 'O servidor {server} está noutra rede que a chave ({chainName}).'
				  })
						.replace('{server}', form.server ?? '')
						.replace('{chainName}', ('chainName' in form && form.chainName) || '')
			: '';

	$: supplyWarning =
		data.addressSupply === 'low'
			? text({
					en: 'This key is almost out of receiving addresses. Delete this configuration and set up a new key to keep receiving Zcash payments.',
					fr: "Cette clé n'a presque plus d'adresses de réception. Supprimez cette configuration et mettez en place une nouvelle clé pour continuer à recevoir des paiements Zcash.",
					de: 'Dieser Schlüssel hat fast keine Empfangsadressen mehr. Löschen Sie diese Konfiguration und richten Sie einen neuen Schlüssel ein, um weiterhin Zcash-Zahlungen zu erhalten.',
					'es-sv':
						'A esta clave casi no le quedan direcciones de recepción. Elimine esta configuración y configure una nueva clave para seguir recibiendo pagos en Zcash.',
					it: 'Questa chiave ha quasi esaurito gli indirizzi di ricezione. Eliminate questa configurazione e impostate una nuova chiave per continuare a ricevere pagamenti Zcash.',
					nl: 'Deze sleutel heeft bijna geen ontvangstadressen meer. Verwijder deze configuratie en stel een nieuwe sleutel in om Zcash-betalingen te blijven ontvangen.',
					pt: 'Esta chave está quase sem endereços de receção. Elimine esta configuração e configure uma nova chave para continuar a receber pagamentos em Zcash.'
			  })
			: data.addressSupply === 'last'
			? text({
					en: 'This key is down to its last receiving address. Delete this configuration and set up a new key to keep receiving Zcash payments.',
					fr: "Cette clé n'a plus qu'une adresse de réception. Supprimez cette configuration et mettez en place une nouvelle clé pour continuer à recevoir des paiements Zcash.",
					de: 'Dieser Schlüssel hat nur noch eine Empfangsadresse. Löschen Sie diese Konfiguration und richten Sie einen neuen Schlüssel ein, um weiterhin Zcash-Zahlungen zu erhalten.',
					'es-sv':
						'A esta clave solo le queda una dirección de recepción. Elimine esta configuración y configure una nueva clave para seguir recibiendo pagos en Zcash.',
					it: 'A questa chiave resta un solo indirizzo di ricezione. Eliminate questa configurazione e impostate una nuova chiave per continuare a ricevere pagamenti Zcash.',
					nl: 'Deze sleutel heeft nog maar één ontvangstadres. Verwijder deze configuratie en stel een nieuwe sleutel in om Zcash-betalingen te blijven ontvangen.',
					pt: 'Esta chave só tem mais um endereço de receção. Elimine esta configuração e configure uma nova chave para continuar a receber pagamentos em Zcash.'
			  })
			: data.addressSupply === 'exhausted'
			? text({
					en: 'This key has no receiving address left, so Zcash payments fail. Delete this configuration and set up a new key.',
					fr: "Cette clé n'a plus d'adresse de réception : les paiements Zcash échouent. Supprimez cette configuration et mettez en place une nouvelle clé.",
					de: 'Dieser Schlüssel hat keine Empfangsadresse mehr, daher schlagen Zcash-Zahlungen fehl. Löschen Sie diese Konfiguration und richten Sie einen neuen Schlüssel ein.',
					'es-sv':
						'A esta clave no le queda ninguna dirección de recepción, así que los pagos en Zcash fallan. Elimine esta configuración y configure una nueva clave.',
					it: 'Questa chiave non ha più indirizzi di ricezione, quindi i pagamenti Zcash non vanno a buon fine. Eliminate questa configurazione e impostate una nuova chiave.',
					nl: 'Deze sleutel heeft geen ontvangstadres meer, dus Zcash-betalingen mislukken. Verwijder deze configuratie en stel een nieuwe sleutel in.',
					pt: 'Esta chave já não tem endereços de receção, por isso os pagamentos em Zcash falham. Elimine esta configuração e configure uma nova chave.'
			  })
			: '';
</script>

<h1 class="text-3xl">Zcash nodeless</h1>

<p>
	{text({
		en: "Payments go straight to the shop's wallet, on one new transparent address per payment. be-BOP only needs the public account key: never a spending key or a seed.",
		fr: "Les paiements arrivent directement sur le wallet de la boutique, sur une nouvelle adresse transparente par paiement. be-BOP n'a besoin que de la clé publique du compte : jamais d'une clé de dépense ni d'une seed.",
		de: 'Zahlungen gehen direkt an die Wallet des Shops, auf eine neue transparente Adresse pro Zahlung. be-BOP braucht nur den öffentlichen Kontoschlüssel: nie einen Ausgabeschlüssel oder eine Seed.',
		'es-sv':
			'Los pagos llegan directamente a la billetera de la tienda, a una nueva dirección transparente por pago. be-BOP solo necesita la clave pública de la cuenta: nunca una clave de gasto ni una semilla.',
		it: 'I pagamenti arrivano direttamente al wallet del negozio, su un nuovo indirizzo trasparente per ogni pagamento. be-BOP ha bisogno solo della chiave pubblica del conto: mai di una chiave di spesa o di un seed.',
		nl: 'Betalingen gaan rechtstreeks naar de wallet van de winkel, op een nieuw transparant adres per betaling. be-BOP heeft alleen de publieke accountsleutel nodig: nooit een bestedingssleutel of een seed.',
		pt: 'Os pagamentos chegam diretamente à carteira da loja, num novo endereço transparente por pagamento. O be-BOP só precisa da chave pública da conta: nunca de uma chave de gasto nem de uma seed.'
	})}
</p>

{#if supplyWarning}
	<div
		class="border-l-4 p-4 text-sm {data.addressSupply === 'low'
			? 'bg-yellow-50 border-yellow-400 text-yellow-700'
			: 'bg-red-50 border-red-400 text-red-700'}"
	>
		! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
		{supplyWarning}
	</div>
{/if}

<h2 class="text-2xl">{t('admin.bitcoinNodeless.configuration')}</h2>

{#key data.zcashNodeless}
	<form
		method="post"
		class="flex flex-col gap-4"
		use:enhance={() => {
			return async ({ result }) => {
				await applyAction(result);
				if (result.type === 'success') {
					await invalidateAll();
				}
			};
		}}
	>
		<label class="form-label">
			{text({
				en: "Transparent account key (xpub, BIP44 path m/44'/133'/0')",
				fr: "Clé de compte transparente (xpub, chemin BIP44 m/44'/133'/0')",
				de: "Transparenter Kontoschlüssel (xpub, BIP44-Pfad m/44'/133'/0')",
				'es-sv': "Clave de cuenta transparente (xpub, ruta BIP44 m/44'/133'/0')",
				it: "Chiave di conto trasparente (xpub, percorso BIP44 m/44'/133'/0')",
				nl: "Transparante accountsleutel (xpub, BIP44-pad m/44'/133'/0')",
				pt: "Chave de conta transparente (xpub, caminho BIP44 m/44'/133'/0')"
			})}
			<input
				class="form-input"
				type="text"
				name="xpub"
				placeholder="xpub... / tpub..."
				required
				readonly={alreadySet}
				bind:value={xpub}
			/>
		</label>

		<label class="form-label">
			{t('admin.bitcoinNodeless.derivationIndex')}
			<input
				type="number"
				name="derivationIndex"
				class="form-input"
				min="0"
				max={data.maxDerivationIndex}
				step="1"
				required
				disabled={alreadySet}
				bind:value={derivationIndex}
			/>
			<p class="text-sm">
				{text({
					en: 'The derivation index is the index of the address to generate. It starts at 0 and increments by 1 for each new address / Zcash payment request on be-BOP. DO NOT CHANGE THIS VALUE unless you know what you are doing. It can lead to reusing existing addresses or creating addresses not detected by your wallet.',
					fr: "L'index de dérivation est l'index de l'adresse à générer. Il commence à 0 et augmente de 1 à chaque nouvelle adresse / demande de paiement Zcash sur be-BOP. NE CHANGEZ PAS CETTE VALEUR sans savoir ce que vous faites : cela peut réutiliser des adresses existantes ou créer des adresses que votre wallet ne détecte pas.",
					de: 'Der Ableitungsindex ist der Index der zu erzeugenden Adresse. Er beginnt bei 0 und erhöht sich um 1 mit jeder neuen Adresse / Zcash-Zahlungsanfrage in be-BOP. ÄNDERN SIE DIESEN WERT NICHT, wenn Sie nicht wissen, was Sie tun: Das kann bestehende Adressen wiederverwenden oder Adressen erzeugen, die Ihre Wallet nicht erkennt.',
					'es-sv':
						'El índice de derivación es el índice de la dirección que se genera. Empieza en 0 y aumenta en 1 con cada nueva dirección / solicitud de pago en Zcash en be-BOP. NO CAMBIE ESTE VALOR si no sabe lo que hace: puede reutilizar direcciones existentes o crear direcciones que su billetera no detecta.',
					it: "L'indice di derivazione è l'indice dell'indirizzo da generare. Parte da 0 e aumenta di 1 per ogni nuovo indirizzo / richiesta di pagamento Zcash su be-BOP. NON MODIFICATE QUESTO VALORE se non sapete cosa state facendo: può riutilizzare indirizzi esistenti o creare indirizzi che il vostro wallet non rileva.",
					nl: 'De afleidingsindex is de index van het te genereren adres. Hij begint bij 0 en stijgt met 1 bij elk nieuw adres / elk Zcash-betaalverzoek in be-BOP. WIJZIG DEZE WAARDE NIET als u niet weet wat u doet: dat kan bestaande adressen hergebruiken of adressen aanmaken die uw wallet niet ziet.',
					pt: 'O índice de derivação é o índice do endereço a gerar. Começa em 0 e aumenta 1 a cada novo endereço / pedido de pagamento em Zcash no be-BOP. NÃO ALTERE ESTE VALOR sem saber o que está a fazer: pode reutilizar endereços existentes ou criar endereços que a sua carteira não deteta.'
				})}
			</p>
		</label>

		<label class="form-label">
			{text({
				en: 'lightwalletd server',
				fr: 'Serveur lightwalletd',
				de: 'lightwalletd-Server',
				'es-sv': 'Servidor lightwalletd',
				it: 'Server lightwalletd',
				nl: 'lightwalletd-server',
				pt: 'Servidor lightwalletd'
			})}
			<input
				class="form-input"
				type="text"
				name="primaryServer"
				required
				bind:value={primaryServer}
			/>
		</label>

		<label class="form-label">
			{text({
				en: 'Backup lightwalletd server, from another operator',
				fr: 'Serveur lightwalletd de secours, chez un autre opérateur',
				de: 'Ersatz-lightwalletd-Server, bei einem anderen Betreiber',
				'es-sv': 'Servidor lightwalletd de respaldo, de otro operador',
				it: 'Server lightwalletd di riserva, di un altro operatore',
				nl: 'Reserve-lightwalletd-server, bij een andere beheerder',
				pt: 'Servidor lightwalletd de reserva, de outro operador'
			})}
			<input class="form-input" type="text" name="backupServer" bind:value={backupServer} />
		</label>

		<label class="checkbox-label">
			<input
				type="checkbox"
				name="skipUsedAddresses"
				class="form-checkbox"
				bind:checked={skipUsedAddresses}
			/>
			{t('admin.bitcoinNodeless.skipUsedAddresses')}
		</label>

		{#if error}
			<p class="text-red-500 text-sm">{error}</p>
		{/if}
		{#if form && 'alreadySetUp' in form}
			<p class="text-red-500 text-sm">
				{text({
					en: 'Zcash nodeless is already set up. Delete the configuration to use another key.',
					fr: 'Zcash nodeless est déjà configuré. Supprimez la configuration pour utiliser une autre clé.',
					de: 'Zcash nodeless ist bereits eingerichtet. Löschen Sie die Konfiguration, um einen anderen Schlüssel zu verwenden.',
					'es-sv':
						'Zcash nodeless ya está configurado. Elimine la configuración para usar otra clave.',
					it: 'Zcash nodeless è già configurato. Eliminate la configurazione per usare un’altra chiave.',
					nl: 'Zcash nodeless is al ingesteld. Verwijder de configuratie om een andere sleutel te gebruiken.',
					pt: 'O Zcash nodeless já está configurado. Elimine a configuração para usar outra chave.'
				})}
			</p>
		{/if}

		<div class="flex gap-2">
			{#if alreadySet}
				<button class="btn btn-black" type="submit" formaction="?/update"
					>{t('admin.action.update')}</button
				>
				<button
					class="btn btn-red ml-auto"
					type="submit"
					formaction="?/delete"
					formnovalidate
					on:click={(e) =>
						confirm(
							text({
								en: 'Delete Zcash nodeless configuration? This action cannot be undone.',
								fr: 'Supprimer la configuration Zcash nodeless ? Cette action est irréversible.',
								de: 'Zcash-nodeless-Konfiguration löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
								'es-sv':
									'¿Eliminar la configuración de Zcash nodeless? Esta acción no se puede deshacer.',
								it: 'Eliminare la configurazione Zcash nodeless? Questa azione non può essere annullata.',
								nl: 'Zcash nodeless-configuratie verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
								pt: 'Eliminar a configuração do Zcash nodeless? Esta ação não pode ser anulada.'
							})
						)
							? true
							: e.preventDefault()}>{t('admin.bitcoinNodeless.deleteConfiguration')}</button
				>
			{:else}
				<button class="btn btn-black" type="submit" formaction="?/initialize"
					>{t('admin.bitcoinNodeless.setUp')}</button
				>
			{/if}
		</div>
	</form>
{/key}

{#if data.nextAddresses.length}
	<h2 class="text-2xl">{t('admin.bitcoinNodeless.nextAddresses')}</h2>

	<p>{t('admin.bitcoinNodeless.nextAddressesDescription')}</p>

	{#if data.hasAlreadyUsedNextAddresses}
		<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-sm text-yellow-700">
			! <strong>{t('admin.bitcoinNodeless.warning')}</strong>
			{t('admin.bitcoinNodeless.alreadyUsedAddressWarning')}
		</div>
	{/if}

	<ul class="font-mono break-all">
		{#each data.nextAddresses as addressData}
			<li class="flex gap-2">
				- {addressData.address}
				{#if addressData.isUsed}
					<span class="text-xs bg-yellow-200 text-yellow-900 px-2 py-1 rounded">
						! {t('admin.bitcoinNodeless.alreadyUsed')}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<!-- A Zcash block comes every 75 seconds, eight times as often as a bitcoin one: it has its own grid. -->
<h2 class="text-2xl">{t('admin.config.manageConfirmationThresholds')}</h2>
<ConfirmationThresholdsForm
	action="?/thresholds"
	thresholds={data.zcashConfirmationBlocksThresholds}
/>
