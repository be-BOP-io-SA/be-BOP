# Pflicht-CMS-Seiten

## Einführung

be-BOP verwendet nativ bestimmte Pflichtseiten, um verschiedene Texte (wie rechtliche Hinweise), die Startseite oder Fehlerseiten anzuzeigen.
Diese Seiten sind CMS-Seiten, die in /admin/CMS wie jede andere Rich-Content-Seite angepasst werden können.

Die Slugs für diese Seiten sind:
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

## /home - Startseite
Diese Seite wird beim Zugriff auf die Stammadresse Ihrer Website (/) angezeigt.
Als Schaufenster Ihres Unternehmens sollte sie (oder kann sie, je nach Geschmack) zusammengefasst:
- Ihre Marke präsentieren
- Ihre Werte präsentieren
- Ihre Neuigkeiten präsentieren
- bestimmte Artikel hervorheben
- es ermöglichen, den Rest Ihrer Website zu durchstöbern, ohne zu den Menüs zurückkehren zu müssen
- Ihre grafische Identität präsentieren
- es ermöglichen, Sie zu kontaktieren
- nicht überladen sein
Während jeder dieser Punkte auf einer eigenen CMS-Seite entwickelt werden kann, sollte eine vertikale Lektüre Ihrer Startseite den Besuchern Lust machen, den Rest Ihrer Website zu entdecken.

## /error - Fehlerseite
Wenn Sie möchten, dass sie so selten wie möglich angezeigt wird, ist es immer besser, den Benutzer auf Inhalte umzuleiten als auf eine rohe Fehlermeldung.
Dies kann folgende Form annehmen:
- eine Entschuldigungsnachricht (unverzichtbar)
- ein Kontaktformular zur Meldung der aufgetretenen Anomalie
- ein Link zu einer Produktauswahl, einer Nachrichtenseite oder der Startseite

## /maintenance - Wartungsseite
Siehe [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
Wenn Sie Arbeiten an Ihrer Website durchführen oder den Zugang für Migration, Backup oder andere Operationen einschränken müssen, können Sie Ihre Website in den Wartungsmodus versetzen.
Das gesamte Publikum (abzüglich einer Liste von Besuchern, deren IP auf die Whitelist gesetzt wurde) wird beim Versuch, eine beliebige Seite Ihrer Website aufzurufen, zur /maintenance-Seite umgeleitet.
Sie können einbinden:
- eine Erklärung zur Schließung der Website
- einen Teaser über die neuen Funktionen, die mit der Wiedereröffnung kommen
- ein Kontaktformular
- Grafiken
- Links zu anderen Websites oder sozialen Netzwerken

## /terms - Nutzungsbedingungen
Diese Seite wird normalerweise in den Footer-Links der Website angezeigt und wird auch im Checkout-Tunnel mit dem obligatorischen Kontrollkästchen **I agree to the terms of service** angezeigt.
Der Link zu dieser obligatorischen Option im Tunnel (/checkout) führt zu /terms und gibt Ihren Besuchern Zugang zu allen Verkaufs- und Nutzungsbedingungen.
Das Ausfüllen dieser Seite ist mühsam, aber dennoch obligatorisch!

## /privacy - Datenschutzrichtlinie
Siehe [privacy-management.md](/docs/en/privacy-management.md)
Diese Seite wird normalerweise in den Footer-Links der Website angezeigt.
Sie informiert Ihre Besucher über alle Bedingungen zur Verwendung ihrer persönlichen Daten, die Einhaltung der DSGVO, die Cookie-Erfassung usw.
Das einzige auf be-BOP vorhandene Cookie (bootik-session) ist das Sitzungs-Cookie, das für den ordnungsgemäßen Betrieb unerlässlich ist.
Wir verwenden keine Werbe-Cookies.
Ein zweites Cookie (lang) ist vorhanden, um Ihre Sprachwahl zu speichern.
Als Betreiber können Sie aus rechtlichen und buchhalterischen Gründen weitere Informationen erfassen (Rechnungsinformationen, IP-Adresse): Bitte erklären Sie dies auf dieser Seite.
Darüber hinaus ist es möglich, Opt-ins für kommerzielle Werbung dem Kunden (deaktiviert) zu präsentieren, obwohl sie auf be-BOP nativ deaktiviert sind, und Sie müssen sich verpflichten, die Wahl des Kunden in Bezug auf seine Opt-ins zu respektieren.
Das Ausfüllen dieser Seite ist mühsam, aber dennoch obligatorisch und ethisch gegenüber Ihren Besuchern!

## /why-vat-customs - Zahlung an den Zoll bei Empfang
Siehe [VAT-configuration.md](/docs/en/VAT-configuration.md)
Unter dem 2B-MwSt.-Regime (Verkauf zum MwSt.-Satz des Verkäuferlandes und Befreiung für die Lieferung physischer Artikel ins Ausland) muss der Kunde eine neue obligatorische Option bestätigen: Ich verstehe, dass ich bei der Lieferung MwSt. zahlen muss. Diese Option verlinkt zur CMS-Seite /why-vat-customs, die erstellt und ausgefüllt werden muss, um zu erklären, warum Ihr Kunde MwSt. in seinem Land bei Erhalt Ihres Artikels zahlen muss.

## /why-collect-ip - Begründung für die IP-Erfassung
Siehe [privacy-management.md](/docs/en/privacy-management.md)
Wenn Sie aus buchhalterischen oder rechtlichen Gründen die IP-Adresse Ihres Kunden für einen dematerialisierten Kauf ohne Postadresse speichern müssen (über /admin/config mit der Option **Request IP collection on deliveryless order**), erhält der Kunde eine obligatorische Option zur Abschluss der Bestellung **I agree to the collection of my IP address (why?)**.
Der Link für diese Option führt zu /why-collect-ip, wo es am besten ist, zu erklären, warum Sie solche Daten speichern möchten (unter Berücksichtigung, dass die Kundenakzeptanz zur Finalisierung der Bestellung obligatorisch ist, wenn Sie Ihr be-BOP so konfigurieren).

## /why-pay-reminder - Verpflichtung zur Zahlung einer Bestellung auf Rechnung
Siehe [order-with-deposit.md](/doc/en/order-with-deposit.md)
Wenn Sie die Zahlung auf Rechnung für einen Ihrer Artikel aktivieren, enthält die erste aufgegebene Bestellung nur die Anzahlung, aber der Kunde verpflichtet sich, dem Verkäufer den Restbetrag der Bestellung zu den dargestellten Bedingungen zu zahlen.
Wenn Ihre Bestellung eine Reservierung für einen Artikel auf Rechnung enthält, wird der Link im Checkout-Tunnel mit dem obligatorischen Kontrollkästchen **I agree that I need to pay the remainder in the future (why?)** angezeigt.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom, /basket-top, /basket-bottom
Siehe [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
