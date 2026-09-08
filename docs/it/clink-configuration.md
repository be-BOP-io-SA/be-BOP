# Configurazione CLINK

CLINK (Common Lightning Interface for Nostr Keys) e un metodo di pagamento Lightning che utilizza il protocollo Nostr come layer di trasporto. Permette ai commercianti di ricevere pagamenti Lightning tramite eventi Nostr crittografati di tipo 21001.

## Panoramica

Quando un cliente paga con CLINK:

1. Una **fattura bolt11** viene creata immediatamente al momento dell'ordine e mostrata come codice QR
2. Qualsiasi wallet Lightning puo scansionare e pagare la bolt11 direttamente
3. I wallet compatibili CLINK possono anche scansionare il **nOffer** del commerciante e ricevere la stessa bolt11 tramite il relay Nostr
4. Il pagamento viene confermato interrogando il nodo Lightning del processore backend configurato per la fattura (tramite hash del pagamento)

CLINK e **solo un layer di trasporto**, non un backend Lightning. La generazione delle fatture e il regolamento vengono delegati al processore Lightning proprio di be-BOP (LND, Blink, PhoenixD, ecc.): lo stesso nodo che supporterebbe qualsiasi altro pagamento Lightning. Questo produce un hash di pagamento reale e un `checkPayment()` autorevole basato sul nodo, che riconcilia contro il backend che ha effettivamente ricevuto i sats.

## Prerequisiti

- Una **chiave privata Nostr** configurata in `.env.local` (formato nsec)
- Un processore Lightning configurato e abilitato (es. Blink, LND, PhoenixD) utilizzato per la generazione delle fatture
- Un relay Nostr per la comunicazione CLINK (predefinito: `wss://strfry.shock.network`)

## Configurazione

### 1. Variabili d'ambiente

Aggiungere in `.env.local`:

```
# Chiave privata Nostr (formato nsec) -- richiesta per la crittografia NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configurazione Admin

Navigare verso **Admin > CLINK**:

- **nOffer**: La vostra stringa nOffer Lightning.Pub (es. `noffer1...`). Identifica il vostro account commerciante ai wallet CLINK.
- **URL del relay Nostr**: Il relay Nostr utilizzato per la comunicazione CLINK (predefinito: `wss://strfry.shock.network`)
- Fare clic su **Save**, poi su **Test connection** per verificare che il relay e il nOffer funzionino correttamente

### 3. Attivare CLINK come metodo di pagamento

Nella pagina **Config**, sotto **Metodi di pagamento**, attivare **Lightning** e impostare il processore Lightning predefinito su **CLINK**. Anche il backend Lightning sottostante (LND, Blink, PhoenixD…) deve essere configurato e abilitato.

## Come funziona

### Flusso di pagamento

1. **Il cliente effettua l'ordine** -> be-BOP delega la creazione della fattura al suo processore Lightning configurato, che emette una bolt11 con un hash di pagamento reale
2. **Codice QR mostrato** -> La fattura bolt11 viene presentata al cliente
3. **Flusso wallet CLINK** -> I wallet compatibili CLINK richiedono invece la fattura via Nostr (kind 21001); la bolt11 viene restituita crittografata (NIP-44)
4. **Il cliente paga** -> Scansiona il QR (o usa il suo wallet CLINK) con qualsiasi wallet Lightning e paga
5. **Ordine confermato** -> Il poller degli ordini di be-BOP chiama `checkPayment()`, che delega al processore Lightning backend e interroga il nodo per la fattura usando il suo hash di pagamento reale; l'ordine viene segnato come pagato

### Protocollo CLINK

Il protocollo CLINK utilizza l'evento Nostr tipo 21001 con crittografia NIP-44:

- **Richiesta** (cliente -> server): Il cliente invia una richiesta di pagamento crittografata con l'importo
- **Risposta** (server -> client): Il server risponde con la fattura bolt11 crittografata
- **Regolamento**: Il cliente paga la fattura bolt11 tramite Lightning standard; il nodo Lightning del commerciante rileva il pagamento

### Rilevamento del pagamento

Il pagamento viene rilevato dal processore Lightning backend stesso: `checkPayment()` reindirizza al processore che ha creato la fattura (registrato per pagamento come `meta.backend`) e interroga quel nodo per la fattura tramite hash del pagamento. **Non c'e alcuna dipendenza dalle ricevute Nostr**: il regolamento viene verificato contro il nodo che ha effettivamente ricevuto i sats, quindi il flusso e stateless e sicuro in multi-processo.

Un pulsante **Controlla stato del pagamento** e disponibile sugli ordini CLINK in sospeso; riavvia solo questo controllo basato sul nodo (il regolamento viene applicato dal poller degli ordini sotto il lock dell'ordine).

### Componenti principali

- **nOffer**: Una stringa di offerta commerciante codificata in bech32 contenente la chiave pubblica Nostr del commerciante, l'URL del relay e l'ID dell'offerta
- **Crittografia NIP-44**: Crittografia end-to-end per richieste e risposte di pagamento
- **Creazione delle fatture**: Delegata al processore Lightning configurato di be-BOP; crea una fattura reale + hash di pagamento, senza andata e ritorno su Nostr
- **Ascoltatore persistente**: Una sottoscrizione Nostr a lungo termine sul relay del commerciante che distribuisce le bolt11 ai wallet CLINK, sopravvivendo alle riconnessioni del relay. L'ascoltatore si avvia automaticamente all'avvio del server.

### Sicurezza

- **Protezione SSRF del relay**: Gli URL dei relay vengono validati contro intervalli di IP privati/interni prima della connessione
- **Validazione BOLT11**: Le fatture devono riportare esattamente l'importo previsto (senza tolleranza) e la rete corrispondente
- **Verifica delle firme**: Tutti gli eventi Nostr in entrata vengono verificati prima dell'elaborazione
- **Filtro chiave pubblica commerciante**: I filtri di sottoscrizione Nostr utilizzano la chiave pubblica propria del commerciante (derivata da `NOSTR_PRIVATE_KEY`), non la chiave di Lightning.Pub

## Wallet compatibili

Qualsiasi wallet Lightning puo pagare il codice QR bolt11. Per il flusso Nostr CLINK, utilizzare un wallet compatibile con CLINK:

- ShockWallet
- ZEUS
- Altri wallet compatibili con CLINK

## Risoluzione dei problemi

### Fattura non creata

- Verificare che un processore Lightning sia configurato e abilitato (es. Blink, LND, PhoenixD)
- Verificare che `NOSTR_PRIVATE_KEY` sia impostato in `.env.local`
- Controllare i log del server per errori relativi a CLINK

### Codice QR non visualizzato

- Assicurarsi che il file `assets/bebop-b.svg` esista per il logo sovrapposto al QR
- Controllare la console del browser per errori

### Il wallet CLINK non puo connettersi

- Verificare che l'URL del relay sia corretto e accessibile dal server
- Verificare che la lista dei relay Nostr in **Admin > Nostr** includa il relay CLINK
- Assicurarsi che la stringa nOffer sia valida e corrisponda alla chiave Nostr configurata

### Pagamento non confermato

- Verificare che il nodo Lightning backend sia raggiungibile e che la fattura sia stata creata su di esso
- Usare il pulsante **Controlla stato del pagamento** nella pagina dell'ordine per attivare manualmente una ricerca sul nodo
- Il poller degli ordini ricontrolla ogni 2 secondi; il regolamento viene applicato sotto il lock dell'ordine

## Dettagli tecnici

- **Tipo evento Nostr**: 21001
- **Crittografia**: NIP-44 (versione 2)
- **Backend delle fatture**: Il processore Lightning configurato di be-BOP (LND, Blink, PhoenixD…)
- **Rilevamento pagamento**: Ricerca basata sul nodo tramite hash di pagamento reale, delegata al processore backend della fattura
- **URL relay CLINK**: `wss://strfry.shock.network` (configurabile in Admin > CLINK)

## Regolamento nDebit

CLINK e **solo un layer di trasporto** -- **non richiede nDebit** per il regolamento. Il regolamento dei pagamenti e gestito interamente dal processore Lightning predefinito del commerciante (Blink, LND, Phoenixd, ecc.) tramite la fattura bolt11. Il commerciante riceve i sats sul suo backend Lightning esistente.

Se un commerciante desidera utilizzare nDebit per i regolamenti tra nodi (es. con ShockWallet), questo viene configurato nel suo wallet, non in be-BOP.
