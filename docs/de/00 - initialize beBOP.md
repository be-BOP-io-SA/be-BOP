# Initialisieren Sie Ihr be-BOP

Kurze Zusammenfassung vor der ausführlicheren Dokumentation

Sobald Ihr be-BOP läuft (vergessen Sie nicht die readme.md):

## Super-Admin-Konto

- Gehen Sie zu ihre-seite/admin/login
- Erstellen Sie Ihr Superadmin-Konto und Passwort

## /admin/config (über Admin / Config)

### Schützen Sie Ihren Back-Office-Zugang

Gehen Sie zu /admin/config, navigieren Sie zu "Admin hash", definieren Sie einen Hash und speichern Sie.
Die Back-Office-Adresse lautet nun /admin-ihrhash

### Versetzen Sie Ihr be-BOP in den Wartungsmodus

Gehen Sie zu /admin/config und aktivieren Sie "Enable maintenance mode".
Sie können beliebige IPv4-Adressen kommagetrennt hinzufügen, um den Zugang zum Front-Office zu erlauben.
Das Back-Office bleibt immer zugänglich.

### Definieren Sie Ihre Währungen
Gehen Sie zu /admin/config:
- Die Hauptwährung wird im Front-End und auf Rechnungen angezeigt
- Die Zweitwährung ist optional und wird im Front-End angezeigt
- Die Preisreferenzwährung ist die Standardwährung, in der Sie Ihre Preise erstellen, aber Sie können dies pro Produkt ändern
  - Durch Klicken auf die rote Schaltfläche und Bestätigung werden die Produktwährungen mit der gewählten Auswahl überschrieben, aber der Preis wird nicht aktualisiert
- Die Buchhaltungswährung ermöglicht es einem vollständig auf BTC basierenden be-BOP, den Bitcoin-Wechselkurs zum Zeitpunkt der Bestellung zu speichern.

### Zeitsteuerung

Die Abonnementdauer wird für Abonnementprodukte verwendet. Sie können Monat, Woche oder Tag wählen.
Die Abonnementerinnerung ist die Frist zwischen dem Versand des neuen Rechnungsvorschlags und dem Ende des Abonnements.

### Bestätigungsblöcke

Für Bitcoin-On-Chain-Zahlungen können Sie entweder eine Standardanzahl von Verifizierungen für Transaktionen festlegen.
Aber mit "Manage confirmation thresholds" können Sie dies abhängig vom Preis konfigurieren, zum Beispiel:
- < 100€: 0 Bestätigungen
- 100€ bis 1000€: 1 Bestätigung
- 1000€ bis 9999999999999€: 2 Bestätigungen
usw.

### Bestellablauf

"Set desired timeout for payment (in minute)" ermöglicht es, eine Bestellung im be-BOP-System zu stornieren, wenn die Transaktion nicht bezahlt oder ausreichend verifiziert wurde.
Dies gilt nur für Bitcoin-On-Chain, Lightning und Kreditkarte über Sum Up.
Eine zu kurze Zeit zwingt Sie zu kurzen/null On-Chain-Bestätigungsblockzielen.
Eine zu lange Zeit blockiert Ihren Produktbestand, während die Bestellung aussteht.

### Bestandsreservierung
Um Bestandsblockierung zu vermeiden, können Sie "How much time a cart reserves the stock (in minutes)" einstellen.
Wenn ich ein Produkt in meinen Warenkorb lege und es das letzte ist, kann es niemand anderes hinzufügen.
Aber wenn ich meine Bestellung nicht abschließe und länger als die definierte Zeit warte, wird das Produkt wieder verfügbar und aus meinem Warenkorb entfernt, falls jemand anderes es kauft.

### TBD

## /admin/identity (über Config / Identity)

Hier werden alle Informationen zu Ihrem Unternehmen für Rechnungen und Belege verwendet.

"Invoice Information" ist optional und wird oben rechts auf dem Beleg hinzugefügt.

Um die Zahlungsmethode "Banküberweisung" zu ermöglichen, müssen Sie Ihre "Bank account" IBAN und BIC ausfüllen.

Die Kontakt-E-Mail-Adresse wird als Absenderadresse für E-Mails verwendet und in der Fußzeile angezeigt.

## /admin/nostr (über Node management / Nostr)

Gehen Sie zu /admin/nostr (über Node management / Nostr) und klicken Sie auf "Create nsec", falls Sie noch keinen haben.
Danach können Sie ihn in der .env.local eintragen (siehe readme.md).

## /admin/sumup (über Payment partner / Sum Up)

Sobald Sie Ihr Sum Up-Konto haben, verwenden Sie deren Entwicklerschnittstelle und kopieren Sie den API-Schlüssel hierher.
Den Händlercode finden Sie auf Ihrem Dashboard oder in früheren Transaktionsbelegen.
Die Währung ist die Währung Ihres Sum Up-Kontos (in der Regel vom Land, in dem Ihr Unternehmen ansässig ist).

# Der Rest

Derzeit und für Dinge außerhalb des Back-Office gilt: Vergessen Sie nicht die readme.md.

Das Governance-Chart wird bald veröffentlicht, aber zusammengefasst wird jeder Pull Request überprüft von:
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
Und wenn wir einverstanden sind, mergen wir.

Wir werden ultra-spezifische Anforderungen ablehnen und auf generische Funktionen setzen, die von der größtmöglichen Anzahl an Nutzern verwendet werden können.
