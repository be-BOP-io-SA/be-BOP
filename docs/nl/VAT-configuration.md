# Beheer van BTW-regelingen en -tarieven

## Inleiding

Standaard toont be-BOP prijzen exclusief belasting.
BTW-berekeningen worden uitgevoerd vanaf het winkelwagentje.

Er zijn 3 hoofdregelingen voor BTW, plus één variatie:
- Vrijstelling met onderbouwing
- Verkoop tegen het BTW-tarief van het land van de verkoper
- Verkoop tegen het BTW-tarief van het land van de koper
- Verkoop tegen het BTW-tarief van het land van de verkoper met vrijstelling voor kopers die artikelen naar het buitenland laten leveren, onder voorbehoud van BTW-aangifte in hun land via hun eigen douanediensten

Voor belastingcontroles, naleving van de wet en boekhouding is het soms nodig om klantgerelateerde gegevens te verzamelen om een eventuele BTW-vrijstelling te rechtvaardigen.
Deze punten worden behandeld in [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Geval 1: BTW-vrijstelling met onderbouwing

In /admin/config vindt u de optie **Disable VAT for my be-BOP**.
Zodra het vakje is aangevinkt, wordt **een BTW van 0% toegepast op alle toekomstige bestellingen**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

Het inschakelen van deze optie activeert de suboptie **VAT exemption reason (appears on the invoice)**.
Dit is de juridische tekst die moet worden ingevuld om de afwezigheid van BTW aan uw klant te rechtvaardigen.
Bijvoorbeeld in Frankrijk:
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (intracommunautaire dienstverlening)

De opgegeven reden wordt vervolgens op elk van uw facturen vermeld.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Geval 2A: Verkoop tegen het BTW-tarief van het land van de verkoper

In /admin/config vindt u de optie **Use VAT rate from seller's country (always true for products that are digital goods)**.
Vervolgens moet u het land kiezen waaraan uw bedrijf is verbonden in de optie **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

Door dit te doen:
- Het BTW-tarief dat in het winkelwagentje wordt getoond, is dat van het land van uw bedrijf (met een indicator die aan dit land herinnert)
- Het BTW-tarief dat op de afrekenpagina wordt getoond, is dat van het land van uw bedrijf (met een indicator die aan dit land herinnert)
- Het BTW-tarief dat op de bestelling wordt getoond, is dat van het land van uw bedrijf (met een indicator die aan dit land herinnert)
- Het BTW-tarief dat op de factuur wordt getoond, is dat van het land van uw bedrijf

## Geval 2B: Verkoop tegen het BTW-tarief van het land van de verkoper met vrijstelling voor levering van fysieke artikelen in het buitenland

In het vorige geval, in /admin/config, als u de optie **Make VAT = 0% for deliveries outside seller's country** inschakelt, blijven de regels hetzelfde voor klanten die artikelen laten leveren in het land van uw bedrijf.

Hetzelfde geldt voor de aankoop van downloadbare artikelen, donaties of abonnementen (het toegepaste BTW-tarief is dat van het land van uw bedrijf).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

Als uw klant echter zijn goederen wil laten leveren in zijn land (dat niet het land van uw bedrijf is):
- Het BTW-tarief in het winkelwagentje is dat van het land waar zijn IP is gelokaliseerd (op basis van gegevens van ip2location.com)
- Het BTW-tarief op de afrekenpagina is dat van het door de klant gekozen leveringsland
- Het BTW-tarief op de bestelling is dat van het door de klant gekozen leveringsland
- Het BTW-tarief op de factuur is dat van het door de klant gekozen leveringsland
Zelfs als het factuuradres van uw klant in het land van uw bedrijf is, kan levering in het buitenland, onder bepaalde regelingen, betaling vereisen via aangifte bij de douane bij ontvangst van de goederen.

Wanneer deze optie is ingeschakeld, moet de klant op de afrekenpagina (/checkout) een nieuwe verplichte optie valideren: **I understand that I will have to pay VAT upon delivery**.
Deze optie linkt naar de CMS-pagina /why-vat-customs, die moet worden aangemaakt en ingevuld om uit te leggen waarom uw klant de BTW van zijn land moet betalen bij ontvangst van uw artikel.

### Klant die artikelen laat leveren in het be-BOP-land

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Klant die artikelen elders laat leveren

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Geval 3: Verkoop tegen het BTW-tarief van het land van de koper

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Wanneer in /admin/config geen BTW-regelingsoptie is ingeschakeld en een BTW-land is gekozen, is de toegepaste BTW die van de klant:
- Het BTW-tarief in het winkelwagentje is dat van het land waar zijn IP is gelokaliseerd (op basis van gegevens van ip2location.com)
- Het BTW-tarief op de afrekenpagina is dat van het door de klant gekozen leveringsland, of dat van het land waar zijn IP is gelokaliseerd (op basis van gegevens van ip2location.com) voor een winkelwagen zonder artikelen die levering vereisen
- Het BTW-tarief op de bestelling is dat van het door de klant gekozen leveringsland, of dat van het land waar zijn IP is gelokaliseerd (op basis van gegevens van ip2location.com) voor een winkelwagen zonder artikelen die levering vereisen
- Het BTW-tarief op de factuur is dat van het door de klant gekozen leveringsland, of dat van het land waar zijn IP is gelokaliseerd (op basis van gegevens van ip2location.com) voor een winkelwagen zonder artikelen die levering vereisen

## Wordt het IP-adres van de gebruiker dat wordt gebruikt voor BTW-beoordeling opgeslagen?
Deze punten worden behandeld in [privacy-management.md](/docs/fr/privacy-management.md).
Zonder andere configuratie die klantinformatie vereist, wordt de informatie echter niet opgeslagen: deze wordt opgehaald uit de browser (omdat deze door de browser wordt verstrekt) en gebruikt om een BTW- en verzendschatting te geven voordat de klant zijn postadres invoert (een wettelijke aanbeveling opgelegd door bepaalde landen), maar wordt standaard niet opgeslagen in be-BOP-databases.
Aan de andere kant kunnen belasting- en grensdiensten in bepaalde landen een aantal bewijzen eisen ter rechtvaardiging van de BTW-betaling van de klant wanneer deze niet die van het land van de verkoper is. In dat geval biedt be-BOP bepaalde opties (zonder deze standaard aan te moedigen).
Merk op dat het IP-adres in bepaalde landen als geldige facturatiegegevens wordt beschouwd, en dat de verkoper niet verantwoordelijk is voor het IP-adres dat door de browser van de klant wordt doorgegeven.

## Welke BTW-regeling kiezen?

De BTW-regeling van uw bedrijf kan afhangen van:
- De status van uw bedrijf
- Uw type activiteit
- Uw jaarlijkse omzet
- Andere juridische en administratieve subtiliteiten

De veiligste aanpak is om uw accountant, advocaat of relevante bedrijfsdienst te raadplegen om uw doel-BTW-regeling te bepalen en deze in be-BOP te configureren.

## Beheer van verlaagde BTW-profielen

Afhankelijk van het land profiteren sommige van een verlaagd BTW-tarief (culturele producten, donaties aan verenigingen of financiering van politieke campagnes, enz.).
Hiervoor moet u **Custom VAT Rates** aanmaken.
De link is toegankelijk in /admin/config, en op /admin/config/vat:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

U kunt een profiel benoemen en opslaan, en een aangepast BTW-tarief per land invoeren (zonder specificatie wordt het standaard BTW-tarief toegepast).

Voorbeeld van een Custom VAT Rate voor boeken:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Vervolgens kunt u in de productbeheerinterface (/admin/product/{id}) het gewenste BTW-profiel specificeren op basis van het producttype:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" zal standaard de algemene BTW van de be-BOP gebruiken.

De BTW van elk artikel wordt weergegeven in het winkelwagentje:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

En ook op de factuur:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
