# CLINK-configuratie

CLINK (Common Lightning Interface for Nostr Keys) is een Lightning-betaalmethode die het Nostr-protocol gebruikt als transportlaag. Het stelt handelaren in staat om Lightning-betalingen te ontvangen via versleutelde Nostr-events van het type 21001.

## Overzicht

Wanneer een klant betaalt met CLINK:

1. Er wordt direct bij het bestellen een **bolt11-factuur** aangemaakt en weergegeven als QR-code
2. Elke Lightning-wallet kan de QR scannen en de bolt11 direct betalen
3. CLINK-compatibele wallets kunnen ook het **nOffer** van de handelaar scannen en dezelfde bolt11 ontvangen via de Nostr-relay
4. De betaling wordt bevestigd door de Lightning-node van de geconfigureerde backend-processor te bevragen voor de factuur (via betalingshash)

CLINK is **alleen een transportlaag**, geen Lightning-backend. De factuurgeneratie en afrekening worden gedelegeerd naar de eigen geconfigureerde Lightning-processor van be-BOP (LND, Blink, PhoenixD, enz.): dezelfde node die elk ander Lightning-payment zou dragen. Dit levert een echte betalingshash op en een gezaghebbende, node-gedreven `checkPayment()` die verifieert tegen de backend die de sats daadwerkelijk heeft ontvangen.

## Vereisten

- Een **Nostr privaat sleutel** geconfigureerd in `.env.local` (nsec-formaat)
- Een geconfigureerde en ingeschakelde Lightning-processor (bijv. Blink, LND, PhoenixD) gebruikt voor factuurgeneratie
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
- Klik op **Save**, daarna op **Test connection** om te verifiëren dat de relay en nOffer goed werken

### 3. CLINK als betaalmethode inschakelen

Op de pagina **Config**, onder **Betaalmethoden**, **Lightning** inschakelen en de standaard Lightning-processor instellen op **CLINK**. De onderliggende Lightning-backend (LND, Blink, PhoenixD…) moet ook geconfigureerd en ingeschakeld zijn.

## Hoe het werkt

### Betaalstroom

1. **Klant plaatst bestelling** -> be-BOP delegeert de factuuraanmaak naar zijn geconfigureerde Lightning-processor, die een bolt11 met echte betalingshash uitgeeft
2. **QR-code weergegeven** -> De bolt11-factuur wordt aan de klant getoond
3. **CLINK-wallet-stroom** -> CLINK-compatibele wallets vragen de factuur in plaats daarvan op via Nostr (kind 21001); de bolt11 wordt versleuteld (NIP-44) teruggegeven
4. **Klant betaalt** -> Scant de QR (of gebruikt zijn CLINK-wallet) met elke Lightning-wallet en betaalt
5. **Bestelling bevestigd** -> De ordepoller van be-BOP roept `checkPayment()` aan, dat delegeert naar de Lightning-backend-processor en de node bevraagt voor de factuur via de echte betalingshash; de bestelling wordt als betaald gemarkeerd

### CLINK-protocol

Het CLINK-protocol gebruikt Nostr-event type 21001 met NIP-44-versleuteling:

- **Verzoek** (klant -> server): De klant stuurt een versleuteld betaalverzoek met het bedrag
- **Antwoord** (server -> klant): De server antwoordt met de versleutelde bolt11-factuur
- **Afname**: De klant betaalt de bolt11-factuur via standaard Lightning; de Lightning-node van de handelaar detecteert de betaling

### Betalingsdetectie

De betaling wordt gedetecteerd door de Lightning-backend-processor zelf: `checkPayment()` verwijst door naar de processor die de factuur heeft aangemaakt (per betaling geregistreerd als `meta.backend`) en bevraagt die node voor de factuur via de betalingshash. Er is **geen afhankelijkheid van Nostr-ontvangstbewijzen**: de afrekening wordt geverifieerd tegen de node die de sats daadwerkelijk heeft ontvangen, waardoor de stroom stateless en meerprocessig veilig is.

Een knop **Betalingsstatus controleren** is beschikbaar op wachtende CLINK-bestellingen; deze start alleen deze node-gedreven controle opnieuw (de afrekening wordt door de ordepoller onder de orderlock toegepast).

### Belangrijkste componenten

- **nOffer**: Een bech32-gecodeerde handelaarsaanbodtekenreeks met het Nostr publieke sleutel van de handelaar, de relay-URL en het aanbod-ID
- **NIP-44-versleuteling**: End-to-end-versleuteling voor betaalverzoeken en -antwoorden
- **Factuuraanmaak**: Gedelegeerd naar de geconfigureerde Lightning-processor van be-BOP; maakt een echte factuur + betalingshash, zonder Nostr-uitwisseling
- **Persistente listener**: Een langlopend Nostr-abonnement op de relay van de handelaar dat bolt11-facturen aan CLINK-wallets levert en relay-herconnecties overleeft. De listener start automatisch bij het opstarten van de server.

### Beveiliging

- **Relay-SSRF-bescherming**: Relay-URL's worden gevalideerd tegen prive-/interne IP-bereiken voordat er verbinding wordt gemaakt
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

- Controleer of een Lightning-processor is geconfigureerd en ingeschakeld (bijv. Blink, LND, PhoenixD)
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
- **Factuur-backend**: De geconfigureerde Lightning-processor van be-BOP (LND, Blink, PhoenixD…)
- **Betalingsdetectie**: Node-gedreven opzoekactie via echte betalingshash, gedelegeerd naar de backend-processor van de factuur
- **CLINK-relay-URL**: `wss://strfry.shock.network` (configureerbaar via Admin > CLINK)

## nDebit-afrekeningen

CLINK is **alleen een transportlaag** -- het **vereist geen nDebit** voor afrekeningen. Betalingsafrekeningen worden volledig afgehandeld door de standaard Lightning-processor van de handelaar (Blink, LND, Phoenixd, enz.) via de bolt11-factuur. De handelaar ontvangt sats op zijn bestaande Lightning-backend.

Als een handelaar nDebit wil gebruiken voor node-afrekeningen (bijv. met ShockWallet), wordt dit geconfigureerd in zijn wallet, niet in be-BOP.
