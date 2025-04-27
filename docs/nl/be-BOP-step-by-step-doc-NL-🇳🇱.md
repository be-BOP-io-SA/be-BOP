# be-BOP Stap-voor-Stap Documentatie NL 🇳🇱

# 1. Installatie en Initiële Toegang

**1.1. Installatie van be-BOP**

- **Vereisten:**

    1. **Technische Infrastructuur:**

        - **S3-Compatibele Opslag:** Een dienst of oplossing (bijv. MinIO, AWS S3, Scaleway, enz.) met bucketconfiguratie (S3_BUCKET, S3_ENDPOINT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_REGION).

        - **MongoDB Database in ReplicaSet:** Een lokale instantie geconfigureerd als ReplicaSet of het gebruik van een dienst zoals MongoDB Atlas (variabelen MONGODB_URL en MONGODB_DB).

        - **Node.js Omgeving:** Node versie 18 of hoger, met Corepack ingeschakeld (`corepack enable`).

        - **Git LFS Geïnstalleerd:** Om grote bestanden te beheren (commando `git lfs install`).

    2. **Communicatieconfiguratie:**

        - **SMTP:** Geldige SMTP-inloggegevens (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) voor het verzenden van e-mails en notificaties.

    3. **Beveiliging en Notificaties (minstens een van de volgende):**

        - **E-mail:** Een e-mailaccount dat SMTP-configuratie toestaat voor het verzenden van notificaties.

        - **Nostr Sleutel (nsec):** Een NSEC-sleutel (kan worden gegenereerd via de Nostr-interface van be-BOP).

    4. **Ondersteunde Betaalmethoden:**

        - Minstens een betaalmethode die wordt ondersteund door be-BOP, zoals:

            - Bitcoin

            - Lightning Network

            - PayPal

            - SumUp

            - Stripe

            - Bankoverschrijvingen en contante betalingen vereisen handmatige validatie.

    5. **Kennis van Uw BTW-regime:**

        - Het is essentieel om het BTW-regime te kennen dat van toepassing is op uw bedrijf (bijv. verkoop onder BTW van het land van de verkoper, vrijstelling met rechtvaardiging, of verkoop tegen het BTW-tarief van het land van de koper) om de facturatie- en BTW-berekeningsopties in be-BOP correct te configureren.

    6. **Valutaconfiguratie:**

        - Bepaal duidelijk welke primaire valuta u wilt gebruiken, welke secundaire valuta (indien van toepassing) en, voor een 100% BTC-winkel, welke referentievaluta u gebruikt voor de boekhouding.

    7. **Andere Zakelijke Vereisten:**

        - Heb een duidelijke visie op uw bestelprocessen, voorraadbeheer, beleid voor verzendkosten en betaal- en incassomethoden, zowel online als in de winkel.

        - Ken de wettelijke verplichtingen (juridische kennisgevingen, gebruiksvoorwaarden, privacybeleid) voor het opzetten van verplichte CMS-pagina's.

- **Installatie:** Zet de applicatie in met behulp van het officiële installatiescript op uw server en zorg ervoor dat alle afhankelijkheden correct zijn geïnstalleerd.

**1.2. Aanmaken van het Superbeheerder Account**

- Ga naar **/admin/login**.

- Maak uw superbeheerder account aan door een veilige gebruikersnaam en wachtwoord te kiezen. Geef de voorkeur aan een wachtwoordzin van drie of meer woorden.

- Dit account geeft toegang tot alle back-office functionaliteiten.

---

# 2. Beveiliging en Configuratie van het Back-Office

**2.1. Beveiliging van de Toegang**

- **Configuratie van de Toegangshash:**

    - Navigeer naar **/admin/config** via de beheerdersinterface.

    - Stel in de sectie gewijd aan beveiliging (bijv. “Admin hash”) een unieke string (hash) in.

    - Na opslaan verandert de URL van het back-office (bijv. **/admin-uw-hash/login**) om toegang te beperken tot geautoriseerde gebruikers.

**2.2. Inschakelen van de Onderhoudsmodus (indien nodig)**

- In **/admin/config** (Config > Config via de grafische interface), vink de optie **Onderhoudsmodus inschakelen** aan onderaan de pagina.

- Optioneel kunt u een lijst met geautoriseerde IPv4-adressen (gescheiden door komma's) specificeren om toegang tot het front-office toe te staan tijdens onderhoud.

- Het back-office blijft toegankelijk voor beheerders.

**2.3. Configuratie van Hersteltoegang via E-mail of Nostr**

- In **/admin/config**, via de ARM-module, zorg ervoor dat het superbeheerder account een herstel-e-mailadres of npub bevat om wachtwoordherstel te vergemakkelijken.

**2.4. Configuratie van Taal of Meertalige Instellingen**

- In **Admin > Config > Languages**, schakel de taalselector in of uit, afhankelijk van of uw site meertalig of eentalig is (schakel deze uit voor een eentalige site).

**2.5. Configuratie van Lay-out, Logo's en Favicon**

- In **Admin > Merch > Layout**, configureer de bovenste balk, navigatiebalk en voettekst.

    - Zorg ervoor dat de optie “Toon powered by be-BOP” is ingeschakeld in de voettekst.

    - Stel de logo's in voor lichte en donkere thema's, evenals de favicon, via **Admin > Merch > Pictures**.

---

# 3. Configuratie van de Identiteit van de Verkoper

**3.1. Instellen van de Identiteit**

- Ga naar **/admin/identity** (Config > Identity via de grafische interface) om alle informatie over uw bedrijf in te voeren:

    - **Bedrijfsnaam**, **postadres**, **contact-e-mail** gebruikt voor het verzenden van facturen en officiële communicatie.

    - **Facturatie-informatie** (optioneel) die in de rechterbovenhoek van facturen verschijnt.

- **Bankrekening:**

    - Om betalingen via bankoverschrijving mogelijk te maken, geef uw IBAN en BIC op.

**3.2. (Voor Fysieke Winkels) Weergave van het Winkeladres**

- Voor degenen met een fysieke winkel, dupliceer de vorige configuratie in **/admin/identity** (of een speciale sectie) door het volledige winkeladres toe te voegen om dit te tonen op officiële documenten en in de voettekst, indien van toepassing.

---

# 4. Configuratie van Valuta's

**4.1. Definiëren van Valuta's in /admin/config**

- **Primaire Valuta:**

    - Deze valuta wordt weergegeven in het front-office en op facturen.

- **Secundaire Valuta (optioneel):**

    - Kan worden gebruikt voor weergave of als alternatief.

- **Referentievaluta voor Prijzen:**

    - Maakt het mogelijk om prijzen in een “stabiele” valuta vast te stellen.

    - Let op: Klikken op de bevestigingsknop zal de prijzen van alle producten herberekenen zonder de ingevoerde bedragen te wijzigen.

- **Boekhoudvaluta:**

    - Gebruikt om wisselkoersen te volgen in een volledig op Bitcoin gebaseerd be-BOP.

---

# 5. Configuratie van Betaalmethoden

U kunt de duur van een lopende betaling instellen in het **Admin > Config** paneel.

**5.1. Bitcoin en Lightning Betalingen**

- **Bitcoin Nodeless (Onchain):**

    - In **Admin > Payment Settings > Bitcoin nodeless**, configureer de module door de BIP-standaard te selecteren (momenteel alleen BIP84).

    - Voer de publieke sleutel (in **zpub** formaat) in, gegenereerd met een compatibele wallet (bijv. Sparrow Wallet).

    - Wijzig de derivatie-index niet, die begint bij 0 en automatisch wordt verhoogd.

    - Configureer de URL van een block explorer om transacties te verifiëren (bijv. `https://mempool.space`).

- **PhoenixD voor Lightning:**

    - Installeer PhoenixD op uw server volgens de instructies op [https://phoenix.acinq.co/server/get-started](https://phoenix.acinq.co/server/get-started).

    - In **Admin > Payment Settings > PhoenixD**, geef de URL van uw instantie op (houd bij gebruik van Docker rekening met netwerkspecificaties) en voeg het HTTP-wachtwoord van PhoenixD toe. Als PhoenixD op dezelfde server als be-BOP is geïnstalleerd, klik op de knop **Detecteer PhoenixD Server**.

**Voor Gevorderde Gebruikers**

Het is mogelijk om een volledige Bitcoin-node en LND te gebruiken via het `.env` bestand met RPC-inloggegevens (+TOR aanbevolen) voor een externe node. Als alternatief kunt u Bitcoin Core en LND installeren op hetzelfde lokale netwerk als uw be-BOP.

- **Bitcoin Core:**

    - In **Admin > Payment Settings > Bitcoin core node**.

- **Lightning LND:**

    - In **Admin > Payment Settings > Lightning LND node**.

**5.2. PayPal Betaling**

- In **Admin > Payment Settings > PayPal**, voer uw Client ID en Secret in, verkregen via uw PayPal ontwikkelaarsaccount op [https://developer.paypal.com/api/rest/](https://developer.paypal.com/api/rest/).

- Vink **Deze inloggegevens zijn voor de sandbox-omgeving** aan als u de Sandbox-modus wilt gebruiken (voor testen) of laat deze standaard uitgeschakeld voor de productiemodus.

**5.3. SumUp Betaling**

- In **Admin > Payment Settings > SumUp**, voer uw API Key en Merchant Code in op [https://developer.sumup.com/api](https://developer.sumup.com/api).

- De gebruikte valuta komt overeen met de valuta van uw SumUp-account (meestal de valuta van het land van uw bedrijf).

**5.4. Stripe Betaling**

- In **Admin > Payment Settings > Stripe**, voer uw Secret Key en Public Key in op [https://docs.stripe.com/api](https://docs.stripe.com/api).

- De gebruikte valuta komt overeen met de valuta van uw Stripe-account (meestal de valuta van het land van uw bedrijf).

---

# 6. Productbeheer

**6.1. Aanmaken van een Nieuw Product**

- Ga naar **Admin > Merch > Products** om een product toe te voegen of te bewerken.

- **Basisinformatie:**

    - Voer de **Productnaam**, **slug** (unieke identificator voor de URL) en, indien nodig, een **alias** in om toevoeging via het speciale veld in de winkelwagen te vereenvoudigen. Voor producten die online worden verkocht (niet via Point of Sale), is een alias niet vereist.

- **Prijzen:**

    - Stel de prijs in **Price Amount** in en selecteer de valuta in **Price Currency**. U kunt ook gratis producten of producten met vrije prijsbepaling aanmaken door respectievelijk de opties **Dit is een gratis product** en **Dit is een betaal-wat-je-wilt product** aan te vinken.

    - **Productopties:**

        - Geef aan of het product standalone is (enkele toevoeging per bestelling) of variaties heeft (bijv. een t-shirt in S, M, L, XL is niet standalone).

        - Voor producten met variaties, schakel de optie **Product heeft lichte variaties (geen voorraadverschil)** in en voeg variaties toe (naam, waarde en prijsverschil).

**6.2. Voorraadbeheer**

- Voor producten met beperkte voorraad, vink **Het product heeft een beperkte voorraad** aan en voer de beschikbare hoeveelheid in.

- Het systeem toont ook de gereserveerde voorraad (in lopende bestellingen) en de verkochte voorraad.

- U kunt de duur (in minuten) aanpassen waarin een product als gereserveerd wordt beschouwd in een lopende winkelwagen in **Admin > Config**.

---

# 7. Aanmaken en Aanpassen van CMS-pagina's en Widgets

**7.1. Verplichte CMS-pagina's**

- Maak essentiële pagina's in **Admin > Merch > CMS**, zoals:

    - `/home` (homepage),

    - `/error` (foutpagina),

    - `/maintenance` (onderhoudspagina),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (juridische en verplichte informatiepagina's).

- Deze pagina's bieden bezoekers juridische informatie, contactgegevens en uitleg over de werking van uw winkel.

- U kunt zoveel extra pagina's toevoegen als nodig.

**7.2. Lay-out en Grafische Elementen**

- Ga naar **Admin > Merch > Layout** om uw bovenste balk, navigatiebalk en voettekst aan te passen.

- Wijzig links, logo's (via **Admin > Merch > Pictures**) en de beschrijving van uw site.

**7.3. Integratie van Widgets in CMS-pagina's**

- Maak verschillende widgets in **Admin > Widgets**, zoals Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries en Leaderboards.

- Gebruik specifieke tags om dynamische elementen te integreren, bijvoorbeeld:

    - Om een product weer te geven: `[Product=slug?display=img-1]`

    - Om een afbeelding weer te geven: `[Picture=slug width=100 height=100 fit=contain]`

    - Om een slider te integreren: `[Slider=slug?autoplay=3000]`

    - Om een uitdaging, aftelling, formulier, enz. toe te voegen, gebruik respectievelijk `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`.

---

# 8. Bestelbeheer en Rapportage

**8.1. Volgen van Bestellingen**

- In **Admin > Transaction > Orders**, bekijk de lijst met bestellingen.

- Gebruik de beschikbare filters (Bestelnummer, Productalias, Betaalmethode, E-mail, enz.) om uw zoekopdracht te verfijnen.

- U kunt bestelgegevens bekijken (bestelde producten, klantinformatie, verzendadres) en de status van de bestelling beheren (bevestigen, annuleren, labels toevoegen, bestelnotities bekijken).

**8.2. Rapportage en Export**

- Ga naar **Admin > Config > Reporting** om maandelijkse en jaarlijkse statistieken van bestellingen, producten en betalingen te bekijken.

- Elke sectie (Bestelgegevens, Productgegevens, Betalingsgegevens) bevat een knop **Exporteren naar CSV** om de gegevens te downloaden.

---

# 9. Configuratie van Nostr Berichten (Optioneel)

**9.1. Configuratie van de Nostr Sleutel**

- In **Admin > Node Management > Nostr**, klik op **Maak een nsec aan** als u er nog geen heeft.  
    **OPMERKING:** Als u al een nsec heeft gegenereerd en geconfigureerd via een Nostr-client en deze heeft toegevoegd aan uw `.env` bestand, sla deze stap over.

- Kopieer de NSEC-sleutel die door uzelf of be-BOP is gegenereerd en voeg deze toe aan uw **.env.local** bestand onder de variabele `NOSTR_PRIVATE_KEY`.

**9.2. Gerelateerde Functionaliteiten**

- Deze configuratie maakt het mogelijk om notificaties te verzenden via Nostr, de lichtgewicht beheerdersclient te activeren en wachtwoordloze aanmeldingen aan te bieden via tijdelijke links.

---

# 10. Aanpassen van Ontwerp en Thema's

- In **Admin > Merch > Theme**, maak een thema door kleuren, lettertypen en stijlen te definiëren voor de kop, hoofdtekst, voettekst, enz.

- Pas het, eenmaal gemaakt, toe als het actieve thema voor uw winkel.

---

# 11. Configuratie van E-mailsjablonen

- Ga naar **Admin > Config > Templates** om e-mailsjablonen te configureren (bijv. voor wachtwoordherstel, bestelmeldingen, enz.).

- Geef voor elk sjabloon de **Onderwerp** en **HTML-body** op.

- Sjablonen ondersteunen variabelen zoals `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}`, enz.

---

# Voor Gevorderde Gebruikers...

# 12. Configuratie van Tags en Specifieke Widgets

**12.1. Beheer van Tags**

- In **Admin > Widgets > Tag**, maak tags om producten te organiseren of CMS-pagina's te verrijken.

- Geef de **Tagnaam**, **slug**, selecteer de **Tagfamilie** (Creators, Retailers, Temporal, Events) en vul optionele velden in (titel, ondertitel, korte en volledige inhoud, CTAs).

**12.2. Integratie via CMS**

- Om een tag in een pagina te integreren, gebruik de syntaxis:  
    `[Tag=slug?display=var-1]`

# 13. Configuratie van Downloadbare Bestanden

**Een Bestand Toevoegen**

- In **Admin > Merch > Files**, klik op **Nieuw bestand**.

- Geef de **bestandsnaam** op (bijv. “Producthandleiding”) en upload het bestand via de knop **Bladeren…**.

- Eenmaal toegevoegd, wordt een permanente link gegenereerd die kan worden gebruikt in CMS-pagina's om het bestand te delen.

# 14. Nostr-Bot

In de sectie **Node Management > Nostr** kunt u uw Nostr-interface configureren om notificaties te verzenden en te communiceren met klanten. Beschikbare opties zijn onder meer:

- Beheer van de lijst met relais die door uw Nostr-bot worden gebruikt.

- In- of uitschakelen van het automatische introductiebericht dat door de bot wordt verzonden.

- Certificeer uw npub door deze te koppelen aan een logo, naam en domein (alias Lightning BOLT12 voor Zaps).

# 15. Overschrijven van Vertaallabels

Hoewel be-BOP beschikbaar is in meerdere talen (Engels, Frans, Spaans, enz.), kunt u vertalingen aanpassen aan uw behoeften. Ga naar **Config > Languages** om de JSON-vertaalbestanden te laden en te bewerken. Deze bestanden voor elke taal zijn beschikbaar in onze officiële repository op:  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations)

---

# DEEL 2: Teamwerk en POS

# 1. Beheer van Gebruikers en Toegangsrechten

**1.1. Aanmaken van Rollen**

- In **Admin > Config > ARM**, klik op **Maak een rol aan** om rollen te definiëren (bijv. Superbeheerder, Point of Sale, Ticketcontroleur).

- Specificeer voor elke rol:

    - Paden voor **schrijftoegang** en **leestoegang**.

    - Paden beperkt via **Verboden toegang**.

**1.2. Beheer van Gebruikers**

- In **Admin > Users**, maak of bewerk gebruikers door het volgende op te geven:

    - De **login**, **alias**, **herstel-e-mail** en, indien van toepassing, de **Herstel-npub**.

    - Wijs de juiste rol toe aan elke gebruiker.

- Gebruikers met alleen-lezen toegang zien menu's in cursief en kunnen geen wijzigingen aanbrengen.

# 2. Configuratie van het Point of Sale (POS) voor Winkelverkopen

**2.1. Toewijzing en Toegang tot POS**

- Wijs de **Point of Sale (POS)** rol toe via **Admin > Config > ARM** aan de gebruiker die de kassa beheert.

- POS-gebruikers loggen in via de beveiligde identificatiepagina en worden doorgestuurd naar de speciale interface (bijv. **/pos** of **/pos/touch**).

**2.2. POS-specifieke Functionaliteiten**

- **Snelle Toevoeging via Alias:** In **/cart**, maakt het aliasveld het mogelijk om een barcode (ISBN, EAN13) te scannen om het product direct toe te voegen.

- **POS Betaalopties:**

    - Ondersteuning voor multi-mode betalingen (contant, kaart, Lightning, enz.).

    - Opties voor BTW-vrijstelling of cadeaukortingen met verplichte manageriale rechtvaardiging.

- **Weergave aan de Klantzijde:**

    - Op een speciaal scherm (bijv. tablet of extern beeldscherm via HDMI), toon de **/pos/session** pagina zodat klanten de voortgang van hun bestelling kunnen volgen.
