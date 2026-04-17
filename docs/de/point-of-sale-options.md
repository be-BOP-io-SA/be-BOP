# Point-of-Sale-Option

## Einführung

be-BOP ermöglicht es Ihnen, mit Ihrer Community im Internet zu interagieren, und kann auch als Kassensoftware (in einem Stand oder Geschäft) verwendet werden.

POS: Point Of Sale (für das Kassenverhalten im Geschäft)

Durch die Verwendung der POS-Rolle und deren Zuweisung zu einem Profil [team-access-management.md](team-access-management.md) können Sie einem Kassenprofil zusätzliche Optionen für spezifische Kaufoptionen geben.
Die Verwendung des POS-Kontos ermöglicht es Ihnen auch, eine Kundenanzeige bereitzustellen, die Folgendes zeigt:
- eine Startseite
- einen in Echtzeit angezeigten Warenkorb
- den Zahlungs-QR-Code (Bitcoin, Lightning oder CB Sum Up), sobald die Bestellung bestätigt wurde
- eine Bestätigungsseite, sobald die Zahlung bestätigt wurde

## POS-Kontoverwaltung

Die Point-of-Sale-Rolle ist standardmäßig im Modul /admin/arm konfiguriert:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Anmeldung beim POS-Konto

Nach der Zuweisung zu einem Profil muss die Person mit POS-Zugang zur Anmeldeseite in der Administration gehen (/admin/login, wobei /admin die vom be-BOP-Besitzer konfigurierte sichere Zeichenkette ist (siehe [back-office-access.md](back-office-access.md))) und sich anmelden.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(Im Falle eines Geschäfts ist es vorzuziehen, eine Verbindungserhaltungszeit von "1 day" zu wählen, um Abmeldungen mitten in einer Verkaufssitzung zu vermeiden).

## Verwendung des POS-Kontos

Nach der Anmeldung navigiert der POS-Benutzer zur URL /pos:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

Die /pos/session-Sitzung verlinkt zur kundeseitigen Anzeige (siehe unten "Kundenanzeige").
Die Anzeige der letzten Transaktionen ermöglicht es uns, im Falle einer Kundenanfrage Kundendienst zu leisten.
Wenn das POS-Konto im ARM entsprechend konfiguriert wurde, kann es manuell in einem anderen Tab auf die /admin-Seiten zugreifen.

## Warenkorb befüllen

Die dem POS-Konto zugänglichen Produkte sind diejenigen, die im Produktkanal-Selektor konfiguriert sind ([Retail (POS logged seat)](Retail (POS logged seat))):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

Die in der Spalte "Retail (POS logged seat)" aktivierten Optionen gelten ausschließlich für das POS-Konto.

### Katalogdurchsicht

Der Kassierer kann Produkte hinzufügen entweder:
- über CMS-Seiten, die Produkt-Widgets anzeigen (siehe [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md))
- durch Aufrufen der /catalog-Seite, die alle über den Selektor-Kanal berechtigten Artikel anzeigt

Der Weg zum Warenkorb ist dann ähnlich wie bei jedem anderen Benutzer im Web.

### Schnelles Hinzufügen über Aliase

Jedem Produkt kann ein Alias hinzugefügt werden ([product-alias-management.md](product-alias-management.md)).
Wenn die von Ihnen verkauften Artikel einen Barcode haben (Typ ISBN / EAN13), kann dieser als Alias eingegeben werden.

Im Warenkorb hat das POS-Konto eine Option, die dem normalen Benutzer nicht zur Verfügung steht: Auf der Warenkorbseite (/cart) hat das POS-Konto ein Feld zur Eingabe eines Alias (manuell oder über ein USB-Handgerät).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Nach Bestätigung mit "Enter":__

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

Das "Alias"-Feld wird geleert, um das schnellere Scannen des nächsten Artikels zu ermöglichen.

Im Falle eines Fehlers beim Hinzufügen zum Warenkorb wird der Fehler gemeldet und das Alias-Feld geleert:
- Maximale Anzahl der Warenkorbzeilen bereits erreicht: "Cart has too many items".
- Alias nicht vorhanden: "Product not found".
- Bestand ausverkauft: "Product is out of stock".
- "Abonnement"-Artikel 2 Mal hinzugefügt: Der Artikel wird kein 2. Mal hinzugefügt (Abonnement-Artikel haben eine feste Menge von 1).
- Artikel mit zukünftiger Veröffentlichung, aber nicht autorisierter Vorbestellung: "Product is not available for pre-order".
- Artikel mit deaktiviertem Hinzufügen zum Warenkorb im Selektor-Kanal: "Product can't be added to basket".
- Artikel mit bereits erreichter Bestellmengenbegrenzung:
  - Falls kein "Stand alone"-Artikel: "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (derzeit haben wir einen Bug bei dieser Kontrolle: Der Artikel wird hinzugefügt und die Meldung wird nach Aktualisierung des Warenkorbs angezeigt, und die Warenkorbvalidierung kehrt mit der Fehlermeldung zu /cart zurück)
- Artikel nicht für Lieferung in Ihr Zielland verfügbar: Der Artikel wird hinzugefügt, aber die Meldung "Delivery is not available in your country for some items in your basket" wird am unteren Rand des Warenkorbs angezeigt.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Beachten Sie, dass beim Hinzufügen eines PWYW-Artikels über einen Alias der Produktbetrag dem auf dem Produkt konfigurierten Mindestbetrag entspricht.

## Tunnel-Besonderheiten (/checkout)

Das POS-Konto bietet zusätzliche Optionen:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Versand

Das Adressformular ist optional, solange ein Land (abhängig vom Geschäft) ausgewählt ist. Alle anderen Felder sind optional (im Fall eines Kunden, der kauft, direkt im Geschäft abholt und keine nominative Rechnung benötigt).
- Wenn der Kunde eine Lieferung wünscht, kann das Adressformular ausgefüllt werden.
- Wenn der Kunde eine Rechnung benötigt, kann die Option "My delivery address and billing address are different" verwendet werden, um die Rechnung auszufüllen.

### Kostenloser Versand anbieten
Standardmäßig werden alle Bestellungen mit Artikeln, die ein physisches Gegenstück haben, als Lieferung betrachtet.
Der Administrator (oder jeder andere mit Schreibzugriff auf /admin/config) kann diese Option in /admin/config/delivery aktivieren (siehe [delivery-management.md](delivery-management.md)).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Wenn die Option "Allow voiding delivery fees on POS sale" aktiviert ist, wird diese Option auf der /checkout-Seite für das POS-Konto verfügbar sein:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

Wenn die Option aktiviert ist, muss eine verpflichtende Begründung ausgefüllt werden, zur Nachverfolgung durch die Geschäftsleitung:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

Der Betrag (Versandkosten + zugehörige MwSt.) wird auf der nächsten Seite abgezogen (die Preise auf der /checkout-Seite werden noch nicht in Echtzeit gemäß den angewendeten POS-Optionen aktualisiert).

### Mehrfachzahlung oder Ladenzahlung

Das POS-Konto ermöglicht die Verwendung von:
- klassischen Zahlungen, die auf der Website angeboten und aktiviert wurden und berechtigt sind ([payment-management.md](payment-management.md)) für alle Produkte im Warenkorb
- Point-of-Sale-Zahlung, die alle Zahlungen außerhalb des be-BOP-Systems umfasst

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

Wenn "Use multiple payment methods" aktiviert ist, ist die Wahl der Zahlungsmethode nicht mehr erforderlich (siehe "Bestelldetails (/order)" weiter unten).

Bei Verwendung konventioneller Zahlung (CB Sum Up, Lightning oder Bitcoin On-Chain) wird der Zahlungs-QR-Code auf dem Kundengerät angezeigt (siehe "Kundeseitige Anzeige" weiter unten).
Bei Verwendung einer Banküberweisung wird die Bestellung ausgesetzt und erst validiert, sobald die Überweisung manuell eingegangen ist (nicht empfohlen für Zahlungen im Geschäft).

Wenn Sie die Zahlungsmethode "Point of sale" verwenden (Einzelzahlung), müssen Sie die Zahlungsmethode manuell eingeben (siehe "Bestelldetails (/order)" weiter unten).

### MwSt.-Befreiung

Ein POS-Konto kann wählen, einem Kunden ohne MwSt. in Rechnung zu stellen (zum Beispiel in Frankreich ein Geschäftskunde).
⚖️ Ihr lokales Recht muss die Verwendung dieser Option autorisieren, wofür Sie verantwortlich sind.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

Wenn die Option aktiviert ist, muss eine verpflichtende Begründung ausgefüllt werden, zur Nachverfolgung durch die Geschäftsleitung:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

Die Summe (Gesamt-MwSt.) wird auf der nächsten Seite abgezogen (die Preise auf der /checkout-Seite werden noch nicht in Echtzeit gemäß den angewendeten POS-Optionen aktualisiert).

### Geschenkrabatt anwenden

Ein POS-Konto kann wählen, einem Kunden einen Rabatt zu gewähren:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

Wenn die Option aktiviert ist, muss eine verpflichtende Begründung ausgefüllt werden, zur Nachverfolgung durch die Geschäftsleitung:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

Sie müssen auch die Art der Ermäßigung wählen:
- in Prozent (eine Fehlermeldung wird bei ungültiger Eingabe oder 100% Ermäßigung angezeigt)
- als Betrag in der Hauptwährung von be-BOP (siehe [currency-management.md](currency-management.md)) (eine Fehlermeldung wird bei ungültiger Eingabe oder einer Ermäßigung in Höhe des Gesamtbetrags der Bestellung angezeigt)

⚖️ Ihr lokales Recht muss die Verwendung dieser Option und ihre Höchstbeträge autorisieren, wofür Sie verantwortlich sind (z.B. Preisbindung in Frankreich).

⚠️ Solange die Beträge auf der /checkout-Seite nicht in Echtzeit aktualisiert werden, achten Sie auf die Kombination von Ermäßigung + MwSt.-Befreiung + Streichung der Versandkosten.
Obwohl dies nicht abzuraten ist, erfordert die Kombination von Funktionen ein Mindestmaß an Aufmerksamkeit.

### Optionaler Kundenkontakt

Normalerweise ist es im E-Shop-Modus erforderlich, entweder eine E-Mail-Adresse oder einen Nostr npub anzugeben, um Benachrichtigungen über die Bestellung zu erhalten und die Zugangs-URL zu behalten.
Im POS-Modus sind diese Felder optional, wenn ein Kunde seine Kontaktdaten nicht hinterlassen möchte:
- Informieren Sie die Kunden in diesem Fall jedoch, dass sie den Support des Geschäfts nutzen müssen, um die URL ihrer Bestellübersicht, Rechnungen und herunterladbaren Dateien zu finden.
- Stellen Sie einen Drucker bereit, um die Rechnung nach dem Kauf auszudrucken.
- Wenn der Warenkorb ein Abonnement enthält, erklären Sie, dass es sich nicht um eine automatische Verlängerung handelt, sondern dass jedes Mal eine Zahlungsaufforderung an die hinterlassenen Kontaktdaten gesendet wird (siehe [subscription-management.md](subscription-management.md)); und dass daher ohne Kontaktdaten das Abonnement nie verlängert werden kann, sodass es sinnvoll ist, es aus dem Warenkorb zu entfernen.

### Weitere Kunden-Kontrollkästchen

Bei der Validierung einer POS-Bestellung müssen die obligatorischen Kontrollkästchen des Kundenwegs noch bestätigt werden:
- Akzeptanz der Allgemeinen Geschäftsbedingungen und Nutzungsbedingungen
- (falls die Option aktiviert wurde - siehe [privacy-management.md](privacy-management.md)) Akzeptanz der IP-Speicherung für Warenkörbe ohne Lieferadresse
- (falls die Bestellung einen auf Anzahlung bezahlten Artikel enthält - siehe [payment-on-deposit.md](payment-on-deposit.md)) Verpflichtung, den Restbetrag der Bestellung fristgerecht zu zahlen
- (falls die Bestellung eine ausländische Lieferung mit 0% zollfreier und anschließend obligatorischer Zollerklärung umfasst - siehe [VAT-configuration.md](VAT-configuration.md)) Verpflichtung zur Einhaltung der Zollerklärungen

Die Links in diesen Optionen führen zu den hier beschriebenen CMS-Seiten: [required-CMS-pages.md](required-CMS-pages.md).
Da Kunden im Geschäft offensichtlich nicht die Zeit haben werden, diese Dokumente vollständig zu lesen, sind die Alternativen:
- eine gedruckte Version jeder dieser Seiten im Geschäft verfügbar zu haben:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- den Kunden auf die Website zur ausführlichen Einsichtnahme im Nachhinein verweisen
- dem Kunden bei der Validierung jeder erforderlichen Option folgende Frage stellen:
  - Akzeptieren Sie die Allgemeinen Geschäftsbedingungen?
  - Stimmen Sie der Aufzeichnung Ihrer IP-Adresse in unseren Datenbanken zu Buchhaltungszwecken zu?
  - "Da Sie auf Rechnung zahlen, verpflichten Sie sich, den Restbetrag der Bestellung fristgerecht zu zahlen, wenn unser Team Sie erneut kontaktiert?"
  - "Da Ihre Bestellung ins Ausland geliefert wird, zahlen Sie heute keine MwSt. Sind Sie sich bewusst, dass Sie bei der Lieferung MwSt. zahlen müssen?"

### Opt-in

Wenn die Option "Display newsletter + commercial prospection option (disabled by default)" in /admin/config aktiviert wurde (siehe [KYC.md](KYC.md)), wird dieses Formular in /checkout angezeigt:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Diese Optionen müssen nur aktiviert werden 1/ wenn der Kunde Ihnen seine E-Mail-Adresse oder seinen Nostr npub mitteilt 2/ Sie ihm die Frage stellen und seine ausdrückliche Zustimmung erhalten, wobei Sie die Auswirkungen jeder Option erläutern.
Die Aktivierung dieser Optionen ohne ausdrückliche Zustimmung des Kunden liegt in Ihrer Verantwortung und ist in den meisten Fällen rechtswidrig (zusätzlich zu einem völligen Mangel an Respekt gegenüber der Erhebung persönlicher Kundendaten für kommerzielle Nutzung ohne Einwilligung des Kunden).

## Bestellspezifikationen (/order)

### Point-of-Sale-Zahlung

Bis zur Erstellung von Point-of-Sale-Zahlungsuntertypen umfasst die Point-of-Sale-Zahlung alle Nicht-be-BOP-Zahlungen:
- Verwendung eines physischen POS-Terminals (wir gleichen noch nicht automatisch mit Sum UP POS-Terminals ab, auch wenn das Website-Konto und das POS-Terminal-Konto geteilt werden)
- Bargeld
- Scheck (für Länder, die ihn noch verwenden)
- Twint (vorerst wird eine Integration irgendwann möglich sein)
- Goldbarren
- usw.

Das POS-Konto hat daher eine manuelle Validierung (oder Stornierung) der Bestellung mit einem obligatorischen Beleg:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

Die Details werden im Bestellobjekt gespeichert und sollen die buchhalterische Abstimmung erleichtern.

Zum Beispiel können Sie angeben:
- "Bargeld: gegeben 350€, zurückgegeben 43,53€".
- "Scheck Nr. XXXXX, Beleg im Ordner B2 aufbewahrt".
- "Twint: Transaktion XXX"
- "Sum Up: Transaktion XXX"

Um die Sum Up-Transaktionsnummer für eine physische POS-Terminal-Zahlung abzurufen, finden Sie diese hier in der mit dem Terminal verknüpften Anwendung, indem Sie die Transaktion einsehen:
![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Sobald die Zahlung eingegangen ist, können Sie das Feld ausfüllen und validieren und auf die Rechnung zugreifen:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 Wenn Sie die Rechnung als PDF-Datei exportieren möchten, können Sie "Als PDF speichern" als Druckziel auswählen (be-BOP unterstützt derzeit nativ keine PDF-Dokumentengenerierung).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 Wenn Sie die Rechnung drucken und keine browserbezogenen Beschriftungen auf dem Ausdruck haben möchten, können Sie die Option "Kopf- und Fußzeilen" in den Druckeinstellungen deaktivieren.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Mehrfachzahlung

Wenn Sie diese Option bei /checkout gewählt haben:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Können Sie die Funktion "Send a payment request" nutzen, um die Bestellung in mehrere Zahlungen aufzuteilen.

Stellen wir uns vor, dass bei dieser Bestellung 30€ per Kreditkarte mit einem POS-Terminal bezahlt werden, 20€ per Lightning und 6,42€ in bar:

1/ Lösen Sie die 30€ per Kreditkarte über Ihr POS-Terminal ein und bestätigen Sie die Zahlung

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Dann die 20€ in Lightning:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

Und schließlich, sobald die Transaktion bestätigt wurde, den Rest in bar:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Sobald der volle Betrag erreicht ist, wird die Bestellung als "validiert" markiert.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Kundeseitige Anzeige

Während Sie hinter Ihrem Kassen-PC sitzen, können Sie eine kundeseitige Anzeige bereitstellen, damit der Kunde seine Bestellung verfolgen kann.
Sie können wählen zwischen:
- einem zusätzlichen Bildschirm, der über HDMI angeschlossen ist: Öffnen Sie in diesem Fall einen Tab unter der URL /pos/session vom Kassenkonto aus und zeigen Sie den Bildschirm im Vollbildmodus an (oft F11), um die Browser-Kopfzeile zu entfernen
- einem anderen Gerät mit Webbrowser, wie einem Tablet oder Telefon; in diesem Fall müssen Sie:
  - zu /admin/login gehen (mit sicherer Admin-URL)
  - sich mit demselben POS-Konto anmelden
  - die Seite /pos/session anzeigen
  - den Ruhemodus des Geräts deaktivieren
  - je nach Gerät die Webseite in den Vollbildmodus schalten

Wenn ein Warenkorb leer ist und keine Bestellung aussteht, wird ein Warte- und Begrüßungsbildschirm angezeigt:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Sobald ein Artikel von der Kasse aus zum Warenkorb hinzugefügt wird, aktualisiert sich die Anzeige und zeigt dem Käufer den Warenkorb:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Bei einer Lightning-Zahlung

Der QR-Code wird zum Scannen und Bezahlen angezeigt.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Bei einer On-Chain-Bitcoin-Zahlung

(Wir empfehlen die Verwendung von On-Chain-Zahlungen im Geschäft nicht, es sei denn, Sie haben eine geringe Anzahl von Verifizierungen, oder wenn Sie die Zeit haben, Ihren Kunden 15 Minuten bei einem Kaffee zu beschäftigen, während die Bestätigungen stattfinden).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Bei einer Sum Up-Kreditkartenzahlung außerhalb eines POS-Terminals

Wenn Ihr physisches POS-Terminal außer Betrieb ist, kann Ihr Kunde einen QR-Code mit seinem Telefon scannen, um ein Kreditkartenformular auf seinem eigenen Gerät zu erhalten (was bequemer ist, als ihn seine Kreditkarteninformationen auf Ihrem Kassen-PC eingeben zu lassen...).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Wenn eine Lightning / Bitcoin On-Chain / CB Sum Up per QR-Code-Zahlung bestätigt wird

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

Die Anzeige kehrt dann zum Begrüßungs-/Standby-Bildschirm mit der Willkommensnachricht und dem be-BOP-Logo zurück.

### Bei einer Point-of-Sale-Zahlung

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Sobald die Bestellung an der Kasse manuell bestätigt wurde:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

Und schließlich der Start-/Standby-Bildschirm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### Im Fall von Mehrfachzahlungen an der Kasse:

Solange keine Eingabe gemacht wurde:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Wenn ich eine erste Zahlung mache (Point of Sale, für Bargeld):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

Anstelle der Bestätigungsseite kehren Sie zur Seite mit dem aktualisierten Restbetrag zurück:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

Und fahren mit den nächsten Zahlungen fort (hier Lightning):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Sobald die Bestellung vollständig bezahlt ist:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

Und schließlich der Start-/Standby-Bildschirm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
