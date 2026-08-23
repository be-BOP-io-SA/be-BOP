# CLINK-configuratie

CLINK (Common Lightning Interface for Nostr Keys) is een Lightning-betaalmethode die het Nostr-protocol gebruikt als transportlaag. Het stelt handelaren in staat om Lightning-betalingen te ontvangen via versleutelde Nostr-events van het type 21001.

## Overzicht

Wanneer een klant betaalt met CLINK:

1. Er wordt direct bij het bestellen een **bolt11-factuur** aangemaakt en weergegeven als QR-code
2. Elke Lightning-wallet kan de QR scannen en de bolt11 direct betalen
3. CLINK-compatibele wallets kunnen ook het **nOffer** van de handelaar scannen en dezelfde bolt11 ontvangen via de Nostr-relay
4. De betaling wordt bevestigd wanneer Lightning.Pub een ontvangstbewijs (tweede kind 21001-event) naar de handelaar stuurt

CLINK is een transportlaag, geen Lightning-backend. De factuurgenerating wordt gedelegeerd naar de geconfigureerde Lightning-processor (bijv. Blink) of een Lightning.Pub HTTP-endpoint.

## Vereisten

- Een **Nostr privaat sleutel** geconfigureerd in `.env.local` (nsec-formaat)
- Of een geconfigureerde Lightning-processor (bijv. Blink) of een Lightning.Pub HTTP-endpoint
- Een Nostr-relay voor CLINK-communicatie (bijv. `wss://strfry.shock.network`)

## Setup

### 1. Omgevingsvariabelen

Toevoegen in `.env.local`:

```env
# Nostr privaat sleutel (nsec-formaat) -- vereist voor NIP-44-versleuteling
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin-configuratie

Navigeer naar **Admin > Config** en scroll naar het gedeelte **CLINK**:

- **nOffer**: Uw Lightning.Pub nOffer-tekenreeks (bijv. `noffer1...`). Identificeert uw handelaarsaccount bij CLINK-wallets.
- **Relay**: De Nostr-relay-URL voor CLINK-communicatie (bijv. `wss://strfry.shock.network`)
- **Lightning.Pub HTTP-endpoint** (optioneel): Als u een specifieke Lightning.Pub-instantie wilt gebruiken voor factuurgenerating, voert u hier de HTTP-URL in. Anders wordt de geconfigureerde Lightning-processor gebruikt.

### 3. CLINK als betaalmethode inschakelen

Op de pagina **Config**, onder **Betaalmethoden**, **Lightning** inschakelen en de standaard Lightning-processor instellen op **CLINK**.

## Hoe het werkt

### Betaalstroom

1. **Klant plaatst bestelling** → be-BOP stuurt een CLINK-verzoek (kind 21001) naar Lightning.Pub via de relay van de handelaar
2. **Lightning.Pub antwoordt** → Retourneert een bolt11-factuur voor het exacte bedrag
3. **QR-code weergegeven** → De bolt11-factuur wordt aan de klant getoond
4. **Klant betaalt** → Scant de QR met elke Lightning-wallet en betaalt
5. **Ontvangstbewijs komt aan** → Lightning.Pub stuurt een tweede kind 21001-event (ontvangstbewijs) naar de handelaar
6. **Bestelling bevestigd** → be-BOP ontvangt het ontvangstbewijs en markeert de bestelling als betaald

### CLINK-protocol

Het CLINK-protocol gebruikt Nostr-event type 21001 met NIP-44-versleuteling:

- **Verzoek** (klant → server): De klant stuurt een versleuteld betaalverzoek met het bedrag
- **Antwoord** (server → klant): De server antwoordt met de versleutelde bolt11-factuur
- **Ontvangstbewijs** (Lightning.Pub → server): Na betaling stuurt Lightning.Pub een ontvangstbewijs dat de afwikkeling bevestigt
- **Afname**: De klant betaalt de bolt11-factuur via standaard Lightning

### Betalingsdetectie

De betaling wordt uitsluitend gedetecteerd via het **Nostr-ontvangstbewijs** (tweede kind 21001-event van Lightning.Pub). be-BOP **delegeert de betalingsdetectie niet** naar de onderliggende Lightning-processor (Blink, LND, enz.) omdat deze processors facturen die door Lightning.Pub zijn aangemaakt niet kunnen opzoeken.

Als het ontvangstbewijs niet wordt ontvangen (bijv. relayproblemen), verloopt de betaling na de sessietijdslimiet (2 uur). In de praktijk komen ontvangstbewijzen binnen enkele seconden na betaling aan.

### Belangrijkste componenten

- **nOffer**: Een bech32-gecodeerde handelaarsaanbodtekenreeks met het Nostr publieke sleutel van de handelaar, de relay-URL en het aanbod-ID
- **NIP-44-versleuteling**: End-to-end-versleuteling voor betaalverzoeken en -antwoorden
- **Sessieopslag**: Actieve CLINK-sessies worden opgeslagen in MongoDB met een TTL-index, waardoor ze serverherstarts overleven. Een geheugencache zorgt voor snelle opzoekingen.
- **Persistente listener**: Een langlopend Nostr-abonnement op de relay van de handelaar dat zowel inkomende betaalverzoeken als betalingsontvangsten afhandelt en relay-herconnecties overleeft

### Beveiliging

- **Relay-SSRF-bescherming**: Relay-URL's worden gevalideerd tegen prive-/interne IP-bereiken voordat er verbinding wordt gemaakt
- **BOLT11-validatie**: Facturen ontvangen van Lightning.Pub worden gevalideerd op netwerkmatching en bedragenconsistentie
- **Handtekeningverificatie**: Alle inkomende Nostr-events worden geverifieerd voordat ze worden verwerkt

## Compatibele wallets

Elke Lightning-wallet kan de bolt11-QR-code betalen. Voor de CLINK Nostr-stroom, gebruik een CLINK-compatibele wallet:

- ShockWallet
- ZEUS
- Andere CLINK-compatibele wallets

## Probleemoplossing

### Factuur niet aangemaakt

- Controleer of een Lightning-processor is geconfigureerd en ingeschakeld (bijv. Blink), of dat een Lightning.Pub HTTP-endpoint is ingesteld
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

- Controleer of de relay vanaf de server bereikbaar is (de SSRF-bescherming kan interne URL's blokkeren)
- Controleer of Lightning.Pub ontvangstbewijzen naar de juiste relay stuurt
- De sessie verloopt na 2 uur -- als het ontvangstbewijs langer duurt, wordt de betaling niet bevestigd

## Technische details

- **Nostr-event type**: 21001
- **Versleuteling**: NIP-44 (versie 2)
- **Betalingsdetectie**: Nostr-ontvangstbewijs-callback (tweede kind 21001-event)
- **Sessieopslag**: MongoDB met TTL-index (2 uur)
- **Standaardrelays**: `wss://strfry.shock.network`, `wss://relay.shocknet.app`

## nDebit-afrekeningen

CLINK is **alleen een transportlaag** -- het **vereist geen nDebit** voor afrekeningen. Betalingsafrekeningen worden volledig afgehandeld door de standaard Lightning-processor van de handelaar (Blink, LND, Phoenixd, enz.) via de bolt11-factuur. De handelaar ontvangt sats op zijn bestaande Lightning-backend.

Als een handelaar nDebit wil gebruiken voor node-afrekeningen (bijv. met ShockWallet), wordt dit geconfigureerd in zijn wallet, niet in be-BOP.
