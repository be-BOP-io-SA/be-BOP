# Verplichte CMS-pagina's

## Introductie

be-BOP maakt native gebruik van bepaalde verplichte pagina's om verschillende teksten weer te geven (zoals juridische vermeldingen), de startpagina of foutpagina's.
Deze pagina's zijn CMS-pagina's die kunnen worden aangepast in /admin/CMS zoals elke andere pagina met rijke inhoud.

De slugs voor deze pagina's zijn:
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Startpagina
Deze pagina wordt weergegeven bij het openen van de root van uw site (/).
Als uithangbord van uw bedrijf moet (of kan, naar smaak) deze pagina in het kort:
- uw merk presenteren
- uw waarden presenteren
- uw nieuws presenteren
- bepaalde artikelen uitlichten
- u de mogelijkheid bieden om de rest van uw site te doorlopen zonder terug te hoeven naar de menu's
- uw grafische identiteit presenteren
- mensen de mogelijkheid bieden om contact met u op te nemen
- niet overladen zijn
Hoewel elk van deze punten op een eigen CMS-pagina kan worden uitgewerkt, moet een verticale lezing van uw startpagina bezoekers het verlangen geven om de rest van uw site te ontdekken.

## /error - Foutpagina
Als u wilt dat deze zo min mogelijk wordt weergegeven, is het altijd beter om uw gebruiker door te verwijzen naar inhoud in plaats van een kale foutmelding.
Dit kan de vorm aannemen van:
- een verontschuldigingsbericht (essentieel)
- een contactformulier om de gevonden afwijking te melden
- een link naar een selectie producten, een nieuwspagina of de startpagina

## /maintenance - Onderhoudspagina
Zie [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
Wanneer u werkzaamheden aan uw site uitvoert of de toegang moet beperken voor migratie, back-up of andere bewerkingen, kunt u uw site in onderhoud zetten.
Het volledige publiek (minus een lijst bezoekers wiens IP op de whitelist staat), dat probeert een pagina op uw site te openen, wordt omgeleid naar de /maintenance-pagina.
U kunt het volgende opnemen:
- een uitleg over de sluiting van de site
- een teaser over de nieuwe functies die bij de heropening beschikbaar komen
- een contactformulier
- visuele elementen
- links naar andere sites of sociale netwerken

## /terms - Gebruiksvoorwaarden
Deze pagina wordt doorgaans weergegeven in de footerlinks van de site en wordt ook weergegeven in de besteltunnel met het verplichte selectievakje **I agree to the terms of service**.
De link naar deze verplichte optie in de tunnel (/checkout) leidt naar /terms, waardoor uw bezoekers toegang krijgen tot alle algemene verkoop- en gebruiksvoorwaarden.
Het invullen van deze pagina is vervelend, maar niettemin verplicht!

## /privacy - Privacybeleid
Zie [privacy-management.md](/docs/en/privacy-management.md)
Deze pagina wordt doorgaans weergegeven in de footerlinks van de site.
Het laat uw bezoekers alle voorwaarden weten met betrekking tot het gebruik van hun persoonlijke informatie, naleving van de AVG, cookieverzameling, enz.
De enige cookie die aanwezig is (bootik-session) op be-BOP is de sessiecookie, die essentieel is voor de juiste werking.
We gebruiken geen advertentiecookies.
Een tweede cookie (lang) is aanwezig om uw taalkeuze op te slaan.
Als eigenaar kunt u meer informatie verzamelen (facturatiegegevens, IP-adres) om juridische en boekhoudkundige redenen: leg dit uit op deze pagina.
Bovendien, hoewel optins voor commerciele prospectie native zijn gedeactiveerd op be-BOP, is het mogelijk om ze (gedeactiveerd) aan de klant te presenteren, en u moet zich ertoe verbinden de keuze van de klant te respecteren met betrekking tot wat hij of zij kiest in zijn optins.
Het invullen van deze pagina is vervelend, maar niettemin verplicht en ethisch tegenover uw bezoekers!

## /why-vat-customs - Betaling aan de douane bij ontvangst
Zie [VAT-configuration.md](/docs/en/VAT-configuration.md)
Onder het 2B btw-regime (verkoop tegen het btw-tarief van het land van de verkoper en vrijstelling voor de levering van fysieke artikelen in het buitenland), moet de klant een nieuwe verplichte optie valideren: Ik begrijp dat ik btw moet betalen bij levering. Deze optie linkt naar de CMS-pagina /why-vat-customs, die moet worden aangemaakt en ingevuld om uit te leggen waarom uw klant btw moet betalen in zijn land bij ontvangst van uw artikel.

## /why-collect-ip - Rechtvaardiging voor het verzamelen van IP
Zie [privacy-management.md](/docs/en/privacy-management.md)
Als u om boekhoudkundige of juridische redenen het IP-adres van uw klant moet opslaan voor een gedematerialiseerde aankoop zonder postadres (via /admin/config met de optie **Request IP collection on deliveryless order**), krijgt de klant een verplichte optie om de bestelling te voltooien **I agree to the collection of my IP address (why?)**.
De link voor deze optie gaat naar /why-collect-ip, waar het het beste is om uit te leggen waarom u dergelijke gegevens wilt opslaan (onthoud dat aanvaarding door de klant verplicht is om de bestelling te finaliseren als u uw be-BOP op deze manier configureert).

## /why-pay-reminder - Toezegging om een bestelling op rekening te betalen
Zie [order-with-deposit.md](/doc/en/order-with-deposit.md)
Wanneer u betaling op rekening activeert voor een van uw artikelen, bevat de eerste geplaatste bestelling alleen de aanbetaling, maar de klant verbindt zich ertoe de verkoper het restant van het bestelbedrag te betalen onder de gepresenteerde voorwaarden.
Als uw bestelling een reservering voor een artikel op rekening bevat, wordt de link weergegeven in de besteltunnel met het verplichte selectievakje **I agree that I need to pay the remainder in the future (why?)**.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom, /basket-top, /basket-bottom
Zie [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
