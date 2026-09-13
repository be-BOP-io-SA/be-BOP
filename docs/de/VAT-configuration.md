# Verwaltung von MwSt-Regelungen und -Sätzen

## Einführung

Standardmäßig zeigt be-BOP Preise ohne Steuer an.
MwSt-Berechnungen werden ab dem Warenkorb durchgeführt.

Es gibt 3 Haupt-MwSt-Regelungen plus eine Variante:
- Befreiung mit Begründung
- Verkauf zum MwSt-Satz des Verkäuferlandes
- Verkauf zum MwSt-Satz des Käuferlandes
- Verkauf zum MwSt-Satz des Verkäuferlandes mit Befreiung für Käufer, die Waren ins Ausland liefern lassen, vorbehaltlich der MwSt-Zahlungserklärung in ihrem Land über ihre eigenen Zolldienste

Für Steuerprüfungen, rechtliche Compliance und Buchhaltung ist es manchmal notwendig, kundenbezogene Daten zu sammeln, um eine mögliche MwSt-Befreiung zu begründen.
Diese Punkte werden in [privacy-management.md](/docs/fr/privacy-management.md) behandelt.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Fall 1: MwSt-Befreiung mit Begründung

In /admin/config gibt es die Option **Disable VAT for my be-BOP**.
Sobald das Kästchen aktiviert ist, **wird eine MwSt von 0% auf alle zukünftigen Bestellungen angewendet**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

Die Aktivierung dieser Option aktiviert die Unteroption **VAT exemption reason (appears on the invoice)**.
Dies ist der rechtliche Text, der ausgefüllt werden muss, um das Fehlen der MwSt gegenüber Ihrem Kunden zu begründen.
Zum Beispiel in Frankreich:
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (innergemeinschaftliche Dienstleistungserbringung)

Der angegebene Grund wird dann auf jeder Ihrer Rechnungen angegeben.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Fall 2A: Verkauf zum MwSt-Satz des Verkäuferlandes

In /admin/config gibt es die Option **Use VAT rate from seller's country (always true for products that are digital goods)**.
Sie müssen dann das Land auswählen, dem Ihr Unternehmen zugeordnet ist, in der Option **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

Dadurch:
- Der im Warenkorb angezeigte MwSt-Satz ist der des Landes Ihres Unternehmens (mit einem Hinweis auf dieses Land)
- Der auf der Checkout-Seite angezeigte MwSt-Satz ist der des Landes Ihres Unternehmens (mit einem Hinweis auf dieses Land)
- Der auf der Bestellung angezeigte MwSt-Satz ist der des Landes Ihres Unternehmens (mit einem Hinweis auf dieses Land)
- Der auf der Rechnung angezeigte MwSt-Satz ist der des Landes Ihres Unternehmens

## Fall 2B: Verkauf zum MwSt-Satz des Verkäuferlandes mit Befreiung für physische Warenlieferung ins Ausland

Im vorherigen Fall, in /admin/config, wenn Sie die Option **Make VAT = 0% for deliveries outside seller's country** aktivieren, bleiben die Regeln für Kunden gleich, die Waren in das Land Ihres Unternehmens liefern lassen.

Gleiches gilt für den Kauf herunterladbarer Artikel, Spenden oder Abonnements (der angewandte MwSt-Satz ist der des Landes Ihres Unternehmens).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

Wenn Ihr Kunde jedoch seine Ware in sein Land liefern lassen möchte (das nicht das Land Ihres Unternehmens ist):
- Der im Warenkorb angezeigte MwSt-Satz ist der des Landes, in dem seine IP geolokalisiert ist (basierend auf Daten von ip2location.com)
- Der auf der Checkout-Seite angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes
- Der auf der Bestellung angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes
- Der auf der Rechnung angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes
Auch wenn die Rechnungsadresse Ihres Kunden im Land Ihres Unternehmens liegt, kann die Lieferung ins Ausland unter bestimmten Regelungen eine Zahlung per Erklärung beim Zoll bei Wareneingang erfordern.

Wenn diese Option aktiviert ist, muss der Kunde auf der Checkout-Seite (/checkout) eine neue Pflichtoption bestätigen: **I understand that I will have to pay VAT upon delivery**.
Diese Option verlinkt auf die CMS-Seite /why-vat-customs, die erstellt und ausgefüllt werden sollte, um zu erklären, warum Ihr Kunde die MwSt seines Landes bei Erhalt Ihres Artikels zahlen muss.

### Kunde, der Waren im be-BOP-Land liefern lässt

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Kunde, der Waren anderswohin liefern lässt

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Fall 3: Verkauf zum MwSt-Satz des Käuferlandes

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Wenn in /admin/config keine MwSt-Regelungsoption aktiviert ist und ein MwSt-Land gewählt wurde, wird die angewandte MwSt die des Kunden sein:
- Der im Warenkorb angezeigte MwSt-Satz ist der des Landes, in dem seine IP geolokalisiert ist (basierend auf Daten von ip2location.com)
- Der auf der Checkout-Seite angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes, oder der des Landes, in dem seine IP geolokalisiert ist (basierend auf Daten von ip2location.com) für einen Warenkorb ohne lieferpflichtige Artikel
- Der auf der Bestellung angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes, oder der des Landes, in dem seine IP geolokalisiert ist (basierend auf Daten von ip2location.com) für einen Warenkorb ohne lieferpflichtige Artikel
- Der auf der Rechnung angezeigte MwSt-Satz ist der des vom Kunden gewählten Lieferlandes, oder der des Landes, in dem seine IP geolokalisiert ist (basierend auf Daten von ip2location.com) für einen Warenkorb ohne lieferpflichtige Artikel

## Wird die IP des Benutzers für die MwSt-Bewertung gespeichert?
Diese Punkte werden in [privacy-management.md](/docs/fr/privacy-management.md) behandelt.
Ohne andere Konfiguration, die Kundeninformationen erfordert, wird die Information jedoch nicht gespeichert: Sie wird vom Browser abgerufen (wie von diesem bereitgestellt) und verwendet, um eine MwSt- und Versandschätzung zu geben, bevor der Kunde seine Postadresse eingibt (eine rechtliche Empfehlung, die von bestimmten Ländern auferlegt wird), aber sie wird nicht nativ in be-BOP-Datenbanken gespeichert.
Andererseits können Steuer- und Grenzdienste in bestimmten Ländern eine Reihe von Nachweisen verlangen, die die MwSt-Zahlung des Kunden begründen, wenn es nicht die des Verkäuferlandes ist. In diesem Fall bietet be-BOP bestimmte Optionen an (ohne sie nativ zu fördern).
Beachten Sie, dass die IP in bestimmten Ländern als gültige Rechnungsdaten gilt und der Verkäufer nicht für die vom Browser des Kunden übermittelte IP-Adresse verantwortlich ist.

## Welche MwSt-Regelung wählen?

Die MwSt-Regelung Ihres Unternehmens kann abhängen von:
- Dem Status Ihres Unternehmens
- Ihrer Art der Tätigkeit
- Ihrem Jahresumsatz
- Anderen rechtlichen und administrativen Feinheiten

Der sicherste Ansatz ist, Ihren Buchhalter, Anwalt oder den zuständigen Geschäftsdienst zu konsultieren, um Ihre Ziel-MwSt-Regelung zu bestimmen und sie in be-BOP zu konfigurieren.

## Verwaltung ermäßigter MwSt-Profile

Je nach Land profitieren einige von einem ermäßigten MwSt-Satz (kulturelle Produkte, Spenden an Vereine oder politische Kampagnenfinanzierung usw.).
Dazu müssen Sie **Custom VAT Rates** erstellen.
Der Link ist unter /admin/config und unter /admin/config/vat zugänglich:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

Sie können ein Profil benennen und speichern und einen benutzerdefinierten MwSt-Satz pro Land eingeben (ohne Angabe wird die Standard-MwSt angewendet).

Beispiel eines Custom VAT Rate für Bücher:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Dann können Sie in der Produktverwaltungsoberfläche (/admin/product/{id}) das gewünschte MwSt-Profil basierend auf dem Produkttyp angeben:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" verwendet standardmäßig die allgemeine MwSt von be-BOP.

Die MwSt jedes Artikels wird im Warenkorb angezeigt:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

Und auch auf der Rechnung:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
