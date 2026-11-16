<script lang="ts">
	import { useI18n, type LocalizedText } from '$lib/i18n';

	export let data;
	export let form;

	const { t, tInline } = useI18n();
	const text = (localized: LocalizedText) => tInline({ text: localized });

	$: settings = form && 'xpub' in form ? form : data.zcashNodeless;
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

<form class="contents" method="post" action="?/save">
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
		<input class="form-input" type="text" name="xpub" value={settings.xpub} required />
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
			value={settings.primaryServer}
			required
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
		<input class="form-input" type="text" name="backupServer" value={settings.backupServer} />
	</label>

	{#if error}
		<p class="alert-error">{error}</p>
	{:else if form && 'saved' in form}
		<p class="alert-success">{t('admin.action.save')} ✓</p>
	{/if}

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">{t('admin.action.save')}</button>
		<button class="btn btn-red" type="submit" form="delete-form">{t('admin.action.reset')}</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>

{#if data.nextAddresses.length}
	<h2 class="text-2xl">
		{text({
			en: 'Next addresses: check that your wallet shows the same ones',
			fr: 'Prochaines adresses : vérifiez que votre wallet affiche les mêmes',
			de: 'Nächste Adressen: Prüfen Sie, dass Ihre Wallet dieselben anzeigt',
			'es-sv': 'Próximas direcciones: compruebe que su billetera muestra las mismas',
			it: 'Prossimi indirizzi: verificate che il vostro wallet mostri gli stessi',
			nl: 'Volgende adressen: controleer of uw wallet dezelfde toont',
			pt: 'Próximos endereços: verifique que a sua carteira mostra os mesmos'
		})}
	</h2>
	<ul class="font-mono text-sm">
		{#each data.nextAddresses as { index, address }}
			<li>{index} — {address}</li>
		{/each}
	</ul>
{/if}
