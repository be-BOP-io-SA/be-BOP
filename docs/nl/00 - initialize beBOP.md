# Uw be-BOP initialiseren

Korte samenvatting voordat de documentatie verder wordt uitgewerkt

Zodra uw be-BOP draait (vergeet de readme.md niet):

## Super-admin account

- Ga naar uw-site/admin/login
- maak uw superadmin-account en wachtwoord aan

## /admin/config (via Admin / Config)

### Beveilig uw backoffice-toegang

Ga naar /admin/config, ga naar "Admin hash", stel een hash in en sla op.
Nu is het backoffice-adres /admin-uwhash

### Uw be-BOP in onderhoudsmodus zetten

Ga naar /admin/config, vink "Enable maintenance mode" aan.
U kunt elk IPv4-adres, gescheiden door komma's, toevoegen om toegang tot de frontoffice toe te staan.
De backoffice blijft altijd toegankelijk.

### Uw valuta's instellen
Ga naar /admin/config:
- de hoofdvaluta wordt gebruikt voor weergave op de front-end en op facturen
- de tweede valuta is optioneel en wordt gebruikt voor weergave op de front-end
- de referentievaluta voor prijzen is de standaardvaluta waarmee u uw prijzen aanmaakt, maar u kunt dit per product wijzigen
  - door op de rode knop te klikken en te bevestigen, worden de productvaluta's overschreven met de gekozen selectie, maar de prijs wordt niet bijgewerkt
- de boekhoudvaluta maakt het voor een volledig BTC-be-BOP mogelijk om de wisselkoers van Bitcoin op het moment van de bestelling op te slaan.

### Timing

Abonnementsduur wordt gebruikt voor abonnementsproducten; u kunt kiezen tussen maand, week of dag.
Abonnementsherinnering is het tijdsinterval tussen het versturen van het nieuwe factuurvoorstel en het einde van het abonnement.

### Bevestigingsblokken

Voor Bitcoin on-chain betalingen kunt u een standaard aantal verificaties voor transacties instellen.
Maar met "Manage confirmation thresholds" kunt u dit afhankelijk maken van de prijs, bijvoorbeeld:
- < 100 EUR: 0 bevestigingen
- 100 EUR tot 1000 EUR: 1 bevestiging
- 1000 EUR tot 9999999999999 EUR: 2 bevestigingen
enz.

### Bestelling verlopen

"Set desired timeout for payment (in minute)" maakt het mogelijk om een bestelling in het be-BOP-systeem te annuleren als de transactie niet betaald of voldoende geverifieerd is.
Dit geldt alleen voor Bitcoin-onchain, Lightning en creditcard via Sum Up.
Een te korte tijd vereist een kort / nul onchain-bevestigingsblokdoel.
Een te lange tijd blokkeert uw productvoorraad zolang de bestelling in behandeling is.

### Voorraadreservering
Om voorraadmisbruik te voorkomen, kunt u instellen "How much time a cart reserves the stock (in minutes)".
Wanneer ik een product aan mijn winkelwagen toevoeg en het is het laatste exemplaar, kan niemand anders het toevoegen.
Maar als ik mijn bestelling niet verwerk en langer wacht dan de ingestelde tijd, komt het product weer beschikbaar en wordt het uit mijn winkelwagen verwijderd als iemand anders het koopt.

### TBD

## /admin/identity (via Config / Identity)

Hier wordt alle informatie over uw bedrijf gebruikt voor facturen en bonnen.

"Invoice Information" is optioneel en wordt rechtsboven op de bon toegevoegd.

Om de betaalmethode "bankoverschrijving" te activeren, moet u uw "Bank account" IBAN en BIC invullen.

Het contacte-mailadres wordt gebruikt als "verzonden als" voor e-mail en wordt weergegeven in de footer.

## /admin/nostr (via Node management / Nostr)

Ga naar /admin/nostr (via Node management / Nostr) en klik op "Create nsec" als u er nog geen heeft.
Daarna kunt u het toevoegen aan het .env.local-bestand (zie readme.md)

## /admin/sumup (via Payment partner / Sum Up)

Zodra u een Sum Up-account heeft, gebruik hun ontwikkelaarsinterface en kopieer de API-sleutel hier.
De Merchant code is te vinden op uw dashboard of op eerdere transactiebonnen.
De valuta is de valuta van uw Sum Up-account (meestal van het land waar uw bedrijf gevestigd is).

# De rest

Voorlopig, en voor zaken buiten de backoffice, vergeet de readme.md niet.

Het governance-schema wordt binnenkort gepubliceerd, maar kort samengevat: elke pull request wordt beoordeeld door:
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
En als we akkoord zijn, mergen we.

We zullen ultraspecifieke behoeften weigeren en kiezen voor generieke functies die door zo veel mogelijk mensen gebruikt kunnen worden.
