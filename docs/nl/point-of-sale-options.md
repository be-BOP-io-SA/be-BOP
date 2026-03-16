# Point of Sale-optie

## Introductie

be-BOP stelt u in staat om met uw gemeenschap op internet te communiceren en kan ook worden gebruikt als kassasoftware (in een stand of winkel).

POS: Point Of Sale (voor kasgedrag in de winkel)

Door de POS-rol te gebruiken en toe te wijzen aan een profiel [team-access-management.md](team-access-management.md), kunt u een kassaprofiel extra opties geven voor specifieke aankoopopties.
Het gebruik van het POS-account maakt het ook mogelijk om een klantendisplay te hebben dat het volgende toont:
- een startpagina
- een realtime weergegeven winkelwagen
- de betalings-QR-code (Bitcoin, Lightning of CB Sum Up) zodra de bestelling is gevalideerd
- een bevestigingspagina zodra de betaling is bevestigd

## POS-accountbeheer

De point-of-sale-rol is standaard geconfigureerd in de /admin/arm-module:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Inloggen op POS-account

Zodra toegewezen aan een profiel, moet de persoon met POS-toegang naar de inlogpagina in de administratie gaan (/admin/login, waarbij /admin de beveiligde tekenreeks is die door de be-BOP-eigenaar is geconfigureerd (zie [back-office-access.md](back-office-access.md))) en inloggen.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(In het geval van een winkel verdient het de voorkeur om een verbindingsonderhoudstijd van "1 dag" te kiezen, om disconnecties midden in een verkoopsessie te voorkomen).

## Het POS-account gebruiken

Eenmaal ingelogd, gaat de POS-gebruiker naar de URL /pos:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

De /pos/session-sessie linkt naar de klantweergave (zie hierna "Klantweergave").
De weergave van de laatste transacties stelt ons in staat klantenservice te bieden bij een klantvraag.
Als het POS-account op deze manier in de ARM is geconfigureerd, kan het handmatig de /admin-pagina's openen in een ander tabblad.

## Winkelwagen vullen

De producten die toegankelijk zijn voor het POS-account zijn die geconfigureerd in de productkanaal-selector ( [Retail (POS logged seat)](Retail (POS logged seat)) ):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

De opties die zijn geactiveerd in de kolom "Retail (POS logged seat)" zijn uitsluitend van toepassing op het POS-account.

### Catalogus doorbladeren

De kassamedewerker kan producten toevoegen via:
- CMS-pagina's die productwidgets weergeven (zie [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md))
- door de /catalog-pagina te openen die alle in aanmerking komende artikelen via het selectorkanaal weergeeft

Het traject naar het winkelwagentje is dan vergelijkbaar met dat van elke andere gebruiker op het web.

### Snel toevoegen via aliassen

Aan elk product kan een alias worden toegevoegd ( [product-alias-management.md](product-alias-management.md) ).
Als de artikelen die u verkoopt een barcode hebben (type ISBN / EAN13), kan deze als alias worden ingevoerd.

In het winkelwagentje heeft het POS-account een optie die niet beschikbaar is voor de gemiddelde gebruiker: door rechtstreeks naar de winkelwagenpagina (/cart) te gaan, heeft het POS-account een veld voor het invoeren van een alias (handmatig of via een USB-handscanner).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Na validatie met "enter":__

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

Het veld "Alias" wordt gewist om het volgende artikel sneller te kunnen scannen.

Bij een fout bij het toevoegen aan de winkelwagen wordt de fout gemeld en wordt het Alias-veld leeggemaakt:
- Maximaal aantal winkelwagenregels al bereikt: "Cart has too many items".
- Alias bestaat niet: "Product not found".
- Voorraad uitverkocht: "Product is out of stock".
- "Subscription"-artikel 2 keer toegevoegd: het artikel wordt geen 2e keer toegevoegd (abonnementsartikelen hebben een vaste hoeveelheid van 1).
- Artikel met toekomstige releasedatum maar niet-geautoriseerde voorbestelling: "Product is not available for pre-order".
- Artikel met uitgeschakelde winkelwagentoevoeging in selectorkanaal: "Product can't be added to basket".
- Artikel met al bereikte bestelhoeveelheidslimiet:
  - Als het geen "Stand alone"-artikel is: "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (momenteel is er een bug met deze controle, het artikel wordt toegevoegd en het bericht wordt weergegeven na het vernieuwen van de winkelwagen, en winkelwagenvalidatie keert terug naar /cart met het foutbericht)
- Artikel niet beschikbaar voor levering in uw bestemmingsland: het artikel wordt toegevoegd, maar het bericht "Delivery is not available in your country for some items in your basket" wordt onderaan de winkelwagen weergegeven.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Merk op dat bij het toevoegen van een PWYW-artikel via alias, het productbedrag het minimumbedrag is dat op het product is geconfigureerd.

## Specifieke kenmerken van de tunnel (/checkout)

Het POS-account biedt extra opties:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Verzending

Het adresformulier is optioneel, zolang een land (afhankelijk van de winkel) is geselecteerd; alle andere velden zijn optioneel (in het geval van een klant die koopt, direct in de winkel afhaalt en geen nominatieve factuur vereist).
- Als de klant levering wenst, kan het adresformulier worden ingevuld.
- Als de klant een factuur wenst, kan de optie "My delivery address and billing address are different" worden gebruikt om de factuur in te vullen.

### Gratis verzending aanbieden
Standaard worden alle bestellingen met artikelen die een fysiek tegendeel hebben beschouwd als leveringen.
De beheerder (of iemand anders met schrijftoegang tot /admin/config) kan deze optie inschakelen in /admin/config/delivery (zie [delivery-management.md](delivery-management.md)).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Als de optie "Allow voiding delivery fees on POS sale" is ingeschakeld, is deze optie beschikbaar op de /checkout-pagina voor het POS-account:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

Als de optie is geactiveerd, moet een verplichte onderbouwing worden ingevuld voor managementopvolging:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

Het bedrag (verzendkosten + bijbehorende btw) wordt afgetrokken op de volgende pagina (de prijzen op de /checkout-pagina worden nog niet in realtime bijgewerkt op basis van de toegepaste POS-opties).

### Meervoudige betaling of winkelbetaling

Het POS-account maakt het mogelijk om het volgende te gebruiken:
- klassieke betalingen die op de site zijn aangeboden, geactiveerd en in aanmerking komen ( [payment-management.md](payment-management.md) ) voor alle producten in het winkelwagentje
- Point of Sale-betaling, die alle betalingen buiten het be-BOP-systeem omvat

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

Als "Use multiple payment methods" is geactiveerd, is de keuze van betaalmethode niet meer nodig (zie "Bestelgegevens (/order)" hieronder).

Bij gebruik van conventionele betaling (CB Sum Up, Lightning of Bitcoin on-chain), wordt de betalings-QR-code weergegeven op het klantapparaat (zie "Klantweergave" hieronder).
Als een bankoverschrijving wordt gebruikt, wordt de bestelling opgeschort en gevalideerd zodra de overschrijving handmatig is ontvangen (niet aanbevolen voor betalingen in de winkel).

Als u de betaalmethode "Point of sale" gebruikt (enkele betaling), moet u de betaalmethode handmatig invoeren (zie "Bestelgegevens (/order)" hieronder).

### Btw-vrijstelling

Een POS-account kan ervoor kiezen om een klant zonder btw te factureren (bijvoorbeeld in Frankrijk een zakelijke klant).
Uw lokale wetgeving moet het gebruik van deze optie toestaan; u bent hiervoor verantwoordelijk.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

Als de optie is geactiveerd, moet een verplichte onderbouwing worden ingevuld voor managementopvolging:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

Het bedrag (totale btw) wordt afgetrokken op de volgende pagina (de prijzen op de /checkout-pagina worden nog niet in realtime bijgewerkt op basis van de toegepaste POS-opties).

### Een kortingsgeschenk toepassen

Een POS-account kan ervoor kiezen om een korting toe te passen voor een klant:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

Als de optie is geactiveerd, moet een verplichte onderbouwing worden ingevuld voor managementopvolging:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

U moet ook het type korting kiezen:
- in percentage (een foutmelding wordt weergegeven bij ongeldige invoer, of 100% korting)
- in bedrag overeenkomend met de hoofdvaluta van be-BOP (zie [currency-management.md](currency-management.md)) (een foutmelding wordt weergegeven bij ongeldige invoer, of een korting die overeenkomt met het ordertotaal)

Uw lokale wetgeving moet het gebruik van deze optie en de maximale bedragen toestaan; u bent hiervoor verantwoordelijk (bijv. eenheidsprijswet in Frankrijk).

Let op: in afwachting van realtime bijwerking van bedragen op de /checkout-pagina, wees voorzichtig met het combineren van korting + btw-vrijstelling + verwijdering van verzendkosten.
Hoewel niet afgeraden, vereist het combineren van functies een minimum aan aandacht.

### Optioneel klantcontact

Normaal gesproken is het in e-shopmodus nodig om een e-mailadres of een Nostr npub achter te laten om meldingen van uw bestelling te ontvangen en de toegangs-URL te bewaren.
In POS-modus zijn deze velden optioneel als een klant weigert zijn contactgegevens achter te laten:
- Informeer klanten er in dit geval over dat ze via het ondersteuningssysteem van de winkel moeten gaan om de URL voor hun besteloverrzicht, facturen en downloadbare bestanden te vinden.
- Zorg voor een printer om de factuur na aankoop af te drukken.
- Als het winkelwagentje een abonnement bevat, leg dan uit dat het geen automatische verlenging is, maar dat telkens een betaalverzoek wordt gedaan op de achtergelaten contactgegevens (zie [subscription-management.md](subscription-management.md)); en daarom kan het abonnement zonder contactgegevens nooit worden verlengd, dus kunt u het net zo goed uit het winkelwagentje verwijderen.

### Overige klantselectievakjes

Bij het valideren van een POS-bestelling moeten de verplichte selectievakjes van het klanttraject nog worden gevalideerd:
- aanvaarding van de algemene verkoop- en gebruiksvoorwaarden
- (als de optie is geactiveerd - zie [privacy-management.md](privacy-management.md)) aanvaarding van IP-opslag voor winkelwagentjes zonder leveringsadres
- (als de bestelling een artikel bevat dat op rekening wordt betaald - zie [payment-on-deposit.md](payment-on-deposit.md)) toezegging om het restant van de bestelling op tijd te betalen
- (als de bestelling een buitenlandse levering omvat met 0% belastingvrij en verplichte douaneaangifte achteraf - zie [VAT-configuration.md](VAT-configuration.md)) toezegging om aan douaneaangiften te voldoen

De links in deze opties leiden naar de CMS-pagina's die hier worden beschreven: [required-CMS-pages.md](required-CMS-pages.md).
Aangezien winkelklanten uiteraard niet de tijd zullen hebben om deze documenten volledig te raadplegen, zijn de alternatieven:
- een afgedrukte versie van elk van deze pagina's beschikbaar hebben in de winkel:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- de klant doorverwijzen naar de website voor uitgebreide raadpleging achteraf
- de klant de volgende vraag stellen bij het valideren van elke vereiste optie:
  - Accepteert u de algemene verkoopvoorwaarden?
  - Stemt u in met het opslaan van uw IP-adres in onze databases voor boekhoudkundige doeleinden?
  - "Aangezien u op rekening betaalt, stemt u ermee in om het restant van de bestelling op tijd te betalen wanneer ons team opnieuw contact met u opneemt?"
  - "Aangezien uw bestelling naar het buitenland wordt geleverd, betaalt u vandaag geen btw. Bent u ervan op de hoogte dat u btw moet betalen bij levering?"

### Optin

Als de optie "Display newsletter + commercial prospection option (disabled by default)" is geactiveerd in /admin/config (zie [KYC.md](KYC.md)), wordt dit formulier weergegeven in /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Deze opties hoeven alleen te worden geactiveerd 1/ als de klant u zijn e-mailadres of Nostr npub verstrekt 2/ u de vraag stelt en hun formele toestemming verkrijgt, waarbij u de implicaties van elke optie uitlegt.
Het activeren van deze opties zonder de expliciete toestemming van de klant te verkrijgen valt onder uw verantwoordelijkheid en is in de meeste gevallen illegaal (naast een volledig gebrek aan respect voor het verzamelen van persoonlijke klantgegevens voor commercieel gebruik zonder toestemming van de klant).

## Bestelspecificaties (/order)

### Point of Sale-betaling

In afwachting van de creatie van Point of Sale-betalingssubtypes, omvat Point of Sale-betaling alle niet-be-BOP-betalingen:
- gebruik van een fysieke POS-terminal (we doen nog geen automatische afstemming met Sum Up POS-terminals, zelfs als het site-account en het POS-terminal-account worden gedeeld)
- contant geld
- cheque (voor landen die dit nog gebruiken)
- twint (momenteel; integratie zal in de toekomst mogelijk zijn)
- goudstaven
- enz.

Het POS-account heeft daarom een handmatige validatie (of annulering) van de bestelling, met een verplichte bon:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

De details worden opgeslagen in het bestelobject en zouden de boekhoudkundige afstemming moeten vergemakkelijken.

U kunt bijvoorbeeld aangeven:
- "Contant: gegeven 350 EUR, teruggegeven 43,53 EUR".
- "Cheque nr. XXXXX, bon opgeslagen in map B2".
- "Twint: transactie XXX"
- "Sum Up: transactie XXX"

Om het Sum Up-transactienummer voor een fysieke POS-terminalbetaling op te halen, kunt u het hier vinden in de applicatie die aan de betaalterminal is gekoppeld door de transactie te raadplegen:
![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Zodra de betaling is ontvangen, kunt u het veld invullen en valideren en de factuur openen:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

Als u de factuur als PDF-bestand wilt exporteren, kunt u "Opslaan als PDF" selecteren als afdrukbestemming (be-BOP ondersteunt momenteel niet native het genereren van PDF-documenten).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

Als u de factuur afdrukt en geen browsergerelateerde labels op de afdruk wilt, kunt u de optie "Headers and footers" uitschakelen in de afdrukinstellingen.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Meervoudige betaling

Als u deze optie hebt gekozen bij /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Kunt u de functie "Send a payment request" gebruiken om de bestelling in meerdere betalingen te splitsen.

Stel dat bij deze bestelling 30 EUR met creditcard via een POS-terminal wordt betaald, 20 EUR via Lightning en 6,42 EUR contant:

1/ Ontvang de 30 EUR per creditcard via uw POS-terminal en valideer vervolgens de betaling

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Vervolgens de 20 EUR in Lightning:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

En tot slot, zodra de transactie is gevalideerd, de rest contant:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Zodra het volledige bedrag is bereikt, wordt de bestelling gemarkeerd als "gevalideerd".

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Klantweergave

Terwijl u achter uw kassa-pc zit, kunt u een klantweergave bieden zodat de klant de bestelling kan volgen.
U kunt kiezen uit:
- een extra scherm aangesloten via HDMI: open in dit geval een tabblad op de URL /pos/session vanuit het kassaaccount en geef het scherm weer in volledig schermmodus (vaak F11) om de browserkop te verwijderen
- een ander apparaat met een webbrowser, zoals een tablet of telefoon; in dit geval moet u:
  - naar /admin/login gaan (met beveiligde admin-URL)
  - inloggen met hetzelfde POS-account
  - de /pos/session-pagina weergeven
  - de slaapstand van het apparaat uitschakelen
  - (afhankelijk van het apparaat) de webpagina op volledig scherm zetten

Wanneer een winkelwagen leeg is en er geen bestelling in behandeling is, wordt een wacht- en welkomstscherm weergegeven:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Zodra een artikel vanuit de kassa aan de winkelwagen wordt toegevoegd, wordt het display bijgewerkt en toont het het winkelwagentje aan de persoon die de aankoop doet:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Bij een Lightning-betaling

De QR-code wordt weergegeven om te scannen en te betalen.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Bij een on-chain Bitcoin-betaling

(We raden het gebruik van on-chain betaling in de winkel niet aan, tenzij u een laag aantal verificaties heeft, of als u de tijd heeft om uw klant 15 minuten bezig te houden met een kopje koffie terwijl de validaties plaatsvinden).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Bij een Sum Up creditcardbetaling buiten een POS-terminal

Als uw fysieke POS-terminal buiten werking is, kan uw klant een QR-code scannen met zijn telefoon om een creditcardformulier op zijn eigen apparaat te krijgen (wat handiger is dan hem zijn creditcardgegevens op uw kassa-pc te laten intypen...).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Wanneer een Lightning / Bitcoin on-chain / CB Sum Up via QR-code-betaling is gevalideerd

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

Het display keert vervolgens terug naar het welkomst-/standbyscherm, met het welkomstbericht en het be-BOP-logo.

### Wanneer een Point of Sale-betaling wordt gedaan

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Zodra de bestelling handmatig bij de kassa is gevalideerd:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

En ten slotte het start-/standbyscherm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### Bij meervoudige betalingen aan de kassa:

Zolang er geen invoer is gedaan:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Als ik een eerste betaling doe (Point of sale, voor contant geld):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

In plaats van de bevestigingspagina keert u terug naar de pagina met het bijgewerkte resterende saldo:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

En ga verder met de volgende betalingen (hier Lightning):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Zodra de bestelling volledig is betaald:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

En ten slotte het start-/standbyscherm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
