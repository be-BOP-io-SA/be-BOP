# CLINK-configuratie

CLINK (Common Lightning Interface for Nostr Keys) is een Lightning-betaalmethode die het Nostr-protocol gebruikt als transportlaag. Het stelt handelaren in staat om Lightning-betalingen te ontvangen via versleutelde Nostr-events van het type 21001.

## Overzicht

Wanneer een klant betaalt met CLINK:

1. Er wordt direct bij het bestellen een **bolt11-factuur** aangemaakt en weergegeven als QR-code
2. Elke Lightning-wallet kan de QR scannen en de bolt11 direct betalen
3. CLINK-compatibele wallets kunnen ook het **nOffer** van de handelaar scannen en dezelfde bolt11 ontvangen via de Nostr-relay
4. De betaling wordt bevestigd door de geconfigureerde backend van de handelaar te bevragen — hun be-BOP Lightning-processor of hun Lightning.Pub-node — voor de factuur

CLINK is **alleen een transportlaag**, geen Lightning-backend. De backend die de bolt11-facturen aanmaakt en afwikkelt, wordt gekozen in **Admin > CLINK**:

- **be-BOP Lightning-processor** (standaard): factuurgeneratie en afrekening worden gedelegeerd naar de eigen geconfigureerde Lightning-processor van be-BOP (LND, Blink, PhoenixD, enz.) — dezelfde node die elk ander Lightning-payment zou dragen.
- **Lightning.Pub-node**: facturen worden aangemaakt door uw eigen Lightning.Pub-node via de HTTP-API (`POST /api/user/invoice/new`), en afrekening wordt opgevraagd bij dezelfde node (`POST /api/user/payment/state`).

Beide opties leveren een echte betalingshash op en een node-gedreven `checkPayment()` die verifieert tegen de backend die de sats daadwerkelijk heeft ontvangen.

## Vereisten

- Een **Nostr privaat sleutel** geconfigureerd in `.env.local` (nsec-formaat)
- Een geconfigureerde en ingeschakelde Lightning-processor (bijv. Blink, LND, PhoenixD) — vereist wanneer de **be-BOP-processor**-backend is geselecteerd
- **OF** een Lightning.Pub **endpoint en token** voor uw eigen Lightning.Pub-node — vereist wanneer de **Lightning.Pub**-backend is geselecteerd
- Een Nostr-relay voor CLINK-communicatie (standaard: `wss://strfry.shock.network`)

## Setup

### 1. Omgevingsvariabelen

Toevoegen in `.env.local`:

```
# Nostr privaat sleutel (nsec-formaat) -- vereist voor NIP-44-versleuteling
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin-configuratie

Navigeer naar **Admin > CLINK**:

- **nOffer**: Uw Lightning.Pub nOffer-tekenreeks (bijv. `noffer1...`). Identificeert uw handelaarsaccount bij CLINK-wallets.
- **Nostr-relay-URL**: De Nostr-relay voor CLINK-communicatie (standaard: `wss://strfry.shock.network`)
- **Lightning-backend**: Kies **be-BOP Lightning-processor** (LND, Blink, PhoenixD…) of **Lightning.Pub-node** — de laatste vereist ook het API-endpoint en -token hieronder.
- Klik op **Save**, daarna op **Test connection** om te verifiëren dat de relay en nOffer goed werken

### 3. CLINK als betaalmethode inschakelen

Op de pagina **Config**, onder **Betaalmethoden**, **Lightning** inschakelen en de standaard Lightning-processor instellen op **CLINK**. De geselecteerde backend moet ook geconfigureerd en ingeschakeld zijn: een Lightning-processor voor de be-BOP-processor-backend, of uw Lightning.Pub-endpoint + token voor de Lightning.Pub-backend.

## Hoe het werkt

### Betaalstroom

1. **Klant plaatst bestelling** -> be-BOP maakt een bolt11 aan (met een echte betalingshash) op de geselecteerde backend — zijn geconfigureerde Lightning-processor of de Lightning.Pub-node
2. **QR-code weergegeven** -> De bolt11-factuur wordt aan de klant getoond
3. **CLINK-wallet-stroom** -> CLINK-compatibele wallets vragen de factuur in plaats daarvan op via Nostr (kind 21001); de bolt11 wordt versleuteld (NIP-44) teruggegeven
4. **Klant betaalt** -> Scant de QR (of gebruikt zijn CLINK-wallet) met elke Lightning-wallet en betaalt
5. **Bestelling bevestigd** -> De ordepoller van be-BOP roept `checkPayment()` aan, dat de geselecteerde backend bevraagt voor de factuur via de echte betalingshash (de Lightning.Pub-node via `POST /api/user/payment/state`); de bestelling wordt als betaald gemarkeerd

### CLINK-protocol

Het CLINK-protocol gebruikt Nostr-event type 21001 met NIP-44-versleuteling:

- **Verzoek** (klant -> server): De klant stuurt een versleuteld betaalverzoek met het bedrag
- **Antwoord** (server -> klant): De server antwoordt met de versleutelde bolt11-factuur
- **Afname**: De klant betaalt de bolt11-factuur via standaard Lightning; de Lightning-node van de handelaar detecteert de betaling

### Betalingsdetectie

Betalingsdetectie is node-gedreven. `checkPayment()` verwijst door naar de backend die per betaling is geregistreerd (`meta.backend`):

- **be-BOP-processor**: de backend-processor van de factuur bevraagt die node `checkPayment` voor de factuur via de betalingshash.
- **Lightning.Pub**: de Lightning.Pub-node van de handelaar wordt bevraagd via `POST /api/user/payment/state` (met de opgeslagen bolt11); deze rapporteert het werkelijk ontvangen bedrag en het afwikkelingstijdstip — nooit een echo van het verwachte bedrag.

Er is **geen afhankelijkheid van Nostr-ontvangstbewijzen**: de afrekening wordt geverifieerd tegen de node die de sats daadwerkelijk heeft ontvangen, waardoor de stroom stateless en meerprocessig veilig is.

Een knop **Betalingsstatus controleren** is beschikbaar op wachtende CLINK-bestellingen; deze start alleen deze node-gedreven controle opnieuw (de afrekening wordt door de ordepoller onder de orderlock toegepast).

### Belangrijkste componenten

- **nOffer**: Een bech32-gecodeerde handelaarsaanbodtekenreeks met het Nostr publieke sleutel van de handelaar, de relay-URL en het aanbod-ID
- **NIP-44-versleuteling**: End-to-end-versleuteling voor betaalverzoeken en -antwoorden
- **Factuuraanmaak**: Aangemaakt op de geselecteerde backend (de Lightning-processor van be-BOP of de HTTP-API van de Lightning.Pub-node) — een echte factuur + betalingshash, zonder Nostr-uitwisseling
- **Persistente listener**: Een langlopend Nostr-abonnement op de relay van de handelaar dat bolt11-facturen aan CLINK-wallets levert en relay-herconnecties overleeft. De listener start automatisch bij het opstarten van de server.

### Beveiliging

- **Relay-SSRF-bescherming**: Relay-URL's worden gevalideerd tegen prive-/interne IP-bereiken voordat er verbinding wordt gemaakt
- **Lightning.Pub-endpoint SSRF-bescherming**: Het Lightning.Pub API-endpoint wordt gevalideerd tegen prive-/interne IP-bereiken voor elke aanmaak- en afwikkelingsoproep
- **BOLT11-validatie**: Facturen moeten exact het verwachte bedrag (zonder tolerantie) en het juiste netwerk dragen
- **Handtekeningverificatie**: Alle inkomende Nostr-events worden geverifieerd voordat ze worden verwerkt
- **Handelaar Pubkey-filter**: Nostr-abonnementsfilters gebruiken het eigen publieke sleutel van de handelaar (afgeleid van `NOSTR_PRIVATE_KEY`), niet de sleutel van Lightning.Pub

## Compatibele wallets

Elke Lightning-wallet kan de bolt11-QR-code betalen. Voor de CLINK Nostr-stroom, gebruik een CLINK-compatibele wallet:

- ShockWallet
- ZEUS
- Andere CLINK-compatibele wallets

## Probleemoplossing

### Factuur niet aangemaakt

- Controleer of de geselecteerde backend is geconfigureerd en ingeschakeld: een Lightning-processor voor de be-BOP-processor-backend, of het Lightning.Pub-endpoint + token voor de Lightning.Pub-backend
- Controleer of `NOSTR_PRIVATE_KEY` is ingesteld in `.env.local`
- Controleer de serverlogs op CLINK-gerelateerde fouten

### QR-code wordt niet weergegeven

- Zorg ervoor dat het bestand `assets/bebop-b.svg` bestaat voor de QR-logo-overlay
- Controleer de browserconsole op fouten

### CLINK-wallet kan geen verbinding maken

- Controleer of de relay-URL correct is en vanaf de server bereikbaar is
- Controleer of de Nostr-relaylijst in **Admin > Nostr** de CLINK-relay bevat
- Zorg ervoor dat de nOffer-tekenreeks geldig is en overeenkomt met het geconfigureerde Nostr-sleutel

### Betaling niet bevestigd

- Controleer of de Lightning-backend-node bereikbaar is en dat de factuur erop is aangemaakt
- Gebruik de knop **Betalingsstatus controleren** op de bestellingspagina om handmatig een node-query te activeren
- De ordepoller controleert elke 2 seconden opnieuw; de afrekening wordt onder de orderlock toegepast

## Technische details

- **Nostr-event type**: 21001
- **Versleuteling**: NIP-44 (versie 2)
- **Factuur-backend**: Selecteerbaar — de Lightning-processor van be-BOP (LND, Blink, PhoenixD…) of de Lightning.Pub-node van de handelaar via de HTTP-API
- **Betalingsdetectie**: Node-gedreven opzoekactie via echte betalingshash — via de processor van de factuur, of via `POST /api/user/payment/state` op de Lightning.Pub-node
- **CLINK-relay-URL**: `wss://strfry.shock.network` (configureerbaar via Admin > CLINK)

## nDebit-afrekeningen

CLINK is **alleen een transportlaag** -- het **vereist geen nDebit** voor afrekeningen. Betalingsafrekeningen worden volledig afgehandeld door de geselecteerde backend (de Lightning-processor van be-BOP of de Lightning.Pub-node) via de bolt11-factuur. De handelaar ontvangt sats op zijn bestaande Lightning-backend.

Als een handelaar nDebit wil gebruiken voor node-afrekeningen (bijv. met ShockWallet), wordt dit geconfigureerd in zijn wallet, niet in be-BOP.
