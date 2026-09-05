# Beheer van verzendkosten

## Introductie
be-BOP biedt momenteel slechts een generieke verzendmethode aan.
Er zijn echter meerdere manieren om verzendkosten te beheren.
Verzendkosten kunnen worden geconfigureerd:
- globaal op /admin/config/delivery
- gedetailleerd op /admin/product/{id}

## Beheermodus
De twee belangrijkste modi zijn:
- Vaste kosten: elke bestelling wordt een bepaald bedrag in rekening gebracht (gedefinieerd in /admin/config/delivery), in een bepaalde valuta.
  - "Apply flat fee for each item instead of once for the whole order": in deze modus worden de vaste kosten per artikelregel toegepast in plaats van per winkelwagen.
- "Fees depending on product": elk product heeft zijn eigen specifieke verzendkosten, die op basis van het aantal bestelde artikelen aan de winkelwagen worden toegevoegd.
  - in deze modus worden alleen de verzendkosten van het duurste artikel toegepast, in plaats van de totale som.

In alle gevallen hebben deze berekeningen alleen betrekking op producten waarvoor de optie "The product has a physical component that will be shipped to the customer's address" is geactiveerd in /admin/product/{id}.
Verzendkosten en vaste bijdragen aan verzendkosten worden niet meegenomen bij het berekenen van producttypen.

### Artikelregel?
[Screenshot requis]
Een winkelwagen van een klant bevat doorgaans meerdere regels, die elk overeenkomen met een product A in hoeveelheid n.
Als ik dus de volgende winkelwagen heb:
- Artikel A hoeveelheid 2
- Artikel B hoeveelheid 3
- Artikel C hoeveelheid 4
- Artikel D hoeveelheid 8
Bevat mijn winkelwagen 4 artikelregels.

In het geval van een configuratie met vaste kosten van 10 EUR, zijn de verzendkosten 10 EUR.
Voor een configuratie met vaste kosten van 10 EUR met de optie "Apply flat fee for each item instead of once for the whole order", zijn de verzendkosten 4 artikelregels * 10 EUR, oftewel 40 EUR.

### Zelfstandig artikel
Soms rechtvaardigt een omvangrijk of breekbaar artikel alleen al een aparte verzending, verzekering, een speciaal pakket, verzendbescherming, enz.
Wanneer u hetzelfde artikel A twee keer aan de winkelwagen toevoegt, toont de winkelwagen een enkele regel met "Artikel A hoeveelheid 2".
Als u de optie "This is a standalone product" inschakelt in /admin/product/{id}, voegt u bij elke toevoeging van een product dit toe op een afzonderlijke regel.
Dus als ik een artikel B heb (bijvoorbeeld een televisie) en ik voeg het 3 keer toe, wordt mijn winkelwagen:
- Artikel A hoeveelheid 2
- Artikel B
- Artikel B
- Artikel B
Mijn winkelwagen bevat nu 4 artikelregels: 1 zelfstandig artikel komt overeen met 1 winkelwagenregel.

## Verzendgebieden
Standaard zijn verzendgebieden en hun kosten niet gedefinieerd.
Om algemene verzendkosten te definiëren, selecteert u "Other countries", voegt u het toe en stelt u een bedrag in.
Als we een verzendprijs definiëren voor land A, een andere voor land B en een laatste voor "Other Countries", wordt de prijs voor "Other Countries" standaard gebruikt voor alle landen die noch land A noch land B zijn.

## Specifieke productverzendprijzen en productverzendrestricties
(TBD)
