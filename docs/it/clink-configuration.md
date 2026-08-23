# Configurazione CLINK

CLINK (Common Lightning Interface for Nostr Keys) e un metodo di pagamento Lightning che utilizza il protocollo Nostr come layer di trasporto. Permette ai commercianti di ricevere pagamenti Lightning tramite eventi Nostr crittografati di tipo 21001.

## Panoramica

Quando un cliente paga con CLINK:

1. Una **fattura bolt11** viene creata immediatamente al momento dell'ordine e mostrata come codice QR
2. Qualsiasi wallet Lightning puo scansionare e pagare la bolt11 direttamente
3. I wallet compatibili CLINK possono anche scansionare il **nOffer** del commerciante e ricevere la stessa bolt11 tramite il relay Nostr
4. Il pagamento viene confermato quando Lightning.Pub invia una ricevuta (secondo evento kind 21001) al commerciante

CLINK e un layer di trasporto, non un backend Lightning. La generazione delle fatture viene delegata al procesor Lightning configurato (es. Blink) o a un endpoint HTTP Lightning.Pub.

## Prerequisiti

- Una **chiave privata Nostr** configurata in `.env.local` (formato nsec)
- Un procesor Lightning configurato (es. Blink) o un endpoint HTTP Lightning.Pub
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

- Attivare **Enable CLINK payments** per abilitare CLINK
- **nOffer**: La vostra stringa nOffer Lightning.Pub (es. `noffer1...`). Identifica il vostro account commerciante ai wallet CLINK.
- **URL del relay Nostr**: Il relay Nostr utilizzato per la comunicazione CLINK (predefinito: `wss://strfry.shock.network`)
- **URL dell'endpoint HTTP Lightning.Pub** (opzionale): Se volete utilizzare un'istanza specifica di Lightning.Pub per la generazione delle fatture, inserite qui il suo URL HTTP. Altrimenti, viene utilizzato il procesor Lightning configurato.
- Fare clic su **Save**, poi su **Test connection** per verificare che il relay e il nOffer funzionino correttamente

### 3. Attivare CLINK come metodo di pagamento

Nella pagina **Config**, sotto **Metodi di pagamento**, attivare **Lightning** e impostare il procesor Lightning predefinito su **CLINK**.

## Come funziona

### Flusso di pagamento

1. **Il cliente effettua l'ordine** -> be-BOP invia una richiesta CLINK (kind 21001) a Lightning.Pub tramite il relay del commerciante
2. **Lightning.Pub risponde** -> Restituisce una fattura bolt11 per l'importo esatto
3. **Codice QR mostrato** -> La fattura bolt11 viene presentata al cliente
4. **Il cliente paga** -> Scansiona il QR con qualsiasi wallet Lightning e paga
5. **La ricevuta arriva** -> Lightning.Pub invia un secondo evento kind 21001 (ricevuta di pagamento) al commerciante
6. **Ordine confermato** -> be-BOP riceve la ricevuta e segna l'ordine come pagato

### Protocollo CLINK

Il protocollo CLINK utilizza l'evento Nostr tipo 21001 con crittografia NIP-44:

- **Richiesta** (cliente -> server): Il cliente invia una richiesta di pagamento crittografata con l'importo
- **Risposta** (server -> client): Il server risponde con la fattura bolt11 crittografata
- **Ricevuta** (Lightning.Pub -> server): Dopo il pagamento, Lightning.Pub invia una ricevuta che conferma il regolamento
- **Regolamento**: Il cliente paga la fattura bolt11 tramite Lightning standard

### Rilevamento del pagamento

Il pagamento viene rilevato esclusivamente tramite la **ricevuta Nostr** (secondo evento kind 21001 da Lightning.Pub). be-BOP **non delega** il rilevamento del pagamento al procesor Lightning sottostante (Blink, LND, ecc.) perche quei procesor non possono cercare fatture create da Lightning.Pub.

Se la ricevuta non viene ricevuta (es. problemi di relay), il pagamento scadra dopo il timeout della sessione (2 ore). In pratica, le ricevute arrivano entro pochi secondi dal pagamento.

Un pulsante **Controlla stato del pagamento** e disponibile sugli ordini CLINK in sospeso, permettendo ai clienti di attivare manualmente la verifica del pagamento.

### Replay all'avvio

All'avvio del server, be-BOP riproduce la storia recente del relay per catturare le ricevute arrivate mentre il server era spento. Interroga gli eventi dalla creazione della sessione in sospeso piu antica (con un buffer di 5 minuti) e rimane aperto per circa 30 secondi per raccogliere le ricevute perse.

### Componenti principali

- **nOffer**: Una stringa di offerta commerciante codificata in bech32 contenente la chiave pubblica Nostr del commerciante, l'URL del relay e l'ID dell'offerta
- **Crittografia NIP-44**: Crittografia end-to-end per richieste e risposte di pagamento
- **Archivio sessioni**: Le sessioni CLINK attive vengono persistite in MongoDB con un indice TTL, sopravvivendo ai riavvii del server. Una cache in memoria fornisce ricerche rapide.
- **Ascoltatore persistente**: Una sottoscrizione Nostr a lungo termine sul relay del commerciante che gestisce sia le richieste di pagamento in entrata che le ricevute di pagamento, sopravvivendo alle riconnessioni del relay. L'ascoltatore si avvia automaticamente all'avvio del server.
- **Decriptazione dual**: Le ricevute da Lightning.Pub sono crittografate con la chiave di Lightning.Pub come mittente. be-BOP tenta una decriptazione dual - prima assumendo l'autore dell'evento come mittente (richieste di pagamento del cliente), poi usando la chiave di Lightning.Pub (ricevute).

### Sicurezza

- **Protezione SSRF del relay**: Gli URL dei relay vengono validati contro intervalli di IP privati/interni prima della connessione
- **Validazione BOLT11**: Le fatture ricevute da Lightning.Pub vengono validate per corrispondenza della rete e coerenza dell'importo
- **Verifica delle firme**: Tutti gli eventi Nostr in entrata vengono verificati prima dell'elaborazione
- **Filtro chiave pubblica commerciante**: I filtri di sottoscrizione Nostr utilizzano la chiave pubblica propria del commerciante (derivata da `NOSTR_PRIVATE_KEY`), non la chiave di Lightning.Pub

## Wallet compatibili

Qualsiasi wallet Lightning puo pagare il codice QR bolt11. Per il flusso Nostr CLINK, utilizzare un wallet compatibile con CLINK:

- ShockWallet
- ZEUS
- Altri wallet compatibili con CLINK

## Risoluzione dei problemi

### Fattura non creata

- Verificare che un procesor Lightning sia configurato e abilitato (es. Blink), o che sia impostato un endpoint HTTP Lightning.Pub
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

- Verificare che il relay sia raggiungibile dal server (la protezione SSRF puo bloccare URL interni)
- Verificare che Lightning.Pub invii le ricevute al relay corretto
- Usare il pulsante **Controlla stato del pagamento** nella pagina dell'ordine per attivare manualmente la verifica
- La sessione scade dopo 2 ore -- se la ricevuta si ritarda oltre quella soglia, il pagamento non sara confermato
- All'avvio del server, il meccanismo di replay cattura automaticamente le ricevute perse recenti

## Dettagli tecnici

- **Tipo evento Nostr**: 21001
- **Crittografia**: NIP-44 (versione 2)
- **Rilevamento pagamento**: Callback ricevuta Nostr (secondo evento kind 21001)
- **Archiviazione sessioni**: MongoDB con indice TTL (2 ore)
- **URL relay CLINK**: `wss://strfry.shock.network` (configurabile in Admin > CLINK)

## Regolamento nDebit

CLINK e **solo un layer di trasporto** -- **non richiede nDebit** per il regolamento. Il regolamento dei pagamenti e gestito interamente dal procesor Lightning predefinito del commerciante (Blink, LND, Phoenixd, ecc.) tramite la fattura bolt11. Il commerciante riceve i sats sul suo backend Lightning esistente.

Se un commerciante desidera utilizzare nDebit per i regolamenti tra nodi (es. con ShockWallet), questo viene configurato nel suo wallet, non in be-BOP.
