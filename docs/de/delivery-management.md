# Versandkostenverwaltung

## Einführung
be-BOP bietet derzeit nur eine generische Versandmethode an.
Es gibt jedoch mehrere Möglichkeiten, Versandkosten zu verwalten.
Versandkosten können konfiguriert werden:
- global unter /admin/config/delivery
- detailliert unter /admin/product/{id}

## Verwaltungsmodus
Die zwei wichtigsten sind:
- Pauschalgebühren: Jede Bestellung wird mit einem bestimmten Betrag (definiert in /admin/config/delivery) in einer definierten Währung berechnet.
  - "Apply flat fee for each item instead of once for the whole order": In diesem Modus wird die Pauschalgebühr auf jede Artikelzeile angewendet, anstatt auf den gesamten Warenkorb.
- "Fees depending on product": Jedes Produkt hat seine eigenen spezifischen Versandkosten, die je nach Bestellmenge zum Warenkorb hinzugefügt werden.
  - In diesem Modus wird nur die Versandgebühr des teuersten Artikels angewendet, anstatt die Gesamtsumme.

In allen Fällen betreffen diese Berechnungen nur Produkte, bei denen die Option "The product has a physical component that will be shipped to the customer's address" unter /admin/product/{id} aktiviert wurde.
Versandkosten und Pauschalversandbeiträge werden bei der Berechnung der Produkttypen nicht berücksichtigt.

### Artikelzeile?
[Screenshot requis]
Ein Warenkorb enthält in der Regel mehrere Zeilen, wobei jede einem Produkt A in der Menge n entspricht.
Wenn ich also folgenden Warenkorb habe:
- Artikel A Menge 2
- Artikel B Menge 3
- Artikel C Menge 4
- Artikel D Menge 8
Enthält mein Warenkorb 4 Artikelzeilen.

Bei einer Pauschalgebühr-Konfiguration von 10€ betragen die Versandkosten 10€.
Bei einer "Pauschalgebühr"-Konfiguration von 10€ mit der Option "Apply flat fee for each item instead of once for the whole order" betragen die Versandkosten 4 Artikelzeilen * 10€, also 40€.

### Eigenständiger Artikel
Manchmal rechtfertigt ein sperriger oder zerbrechlicher Artikel allein einen separaten Versand, eine Versicherung, eine spezielle Verpackung, Transportschutz usw.
Wenn Sie denselben Artikel A zweimal in den Warenkorb legen, zeigt der Warenkorb eine einzelne Zeile mit "Artikel A Menge 2" an.
Wenn Sie die Option "This is a standalone product" unter /admin/product/{id} aktivieren, wird jedes Mal, wenn Sie ein Produkt hinzufügen, eine einzelne Zeile erstellt.
Wenn ich also einen Artikel B habe (zum Beispiel einen Fernseher) und ihn 3 Mal hinzufüge, wird mein Warenkorb:
- Artikel A Menge 2
- Artikel B
- Artikel B
- Artikel B
Mein Warenkorb enthält nun 4 Artikelzeilen: 1 eigenständiger Artikel entspricht 1 Warenkorbzeile.

## Versandzonen
Standardmäßig sind Versandzonen und ihre Gebühren nicht definiert.
Um eine globale Versandgebühr festzulegen, wählen Sie "Other countries", fügen Sie diese hinzu und legen Sie eine Gebühr fest.
Wenn wir einen Versandpreis für Land A, einen weiteren für Land B und einen letzten für "Other Countries" definieren, wird der für "Other Countries" festgelegte Preis standardmäßig für alle Länder verwendet, die weder Land A noch Land B sind.

## Produktspezifische Versandpreise und Produktversandbeschränkungen
(TBD)
