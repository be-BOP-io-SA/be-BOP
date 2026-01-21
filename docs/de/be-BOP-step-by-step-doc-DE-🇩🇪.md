# be-BOP: Schritt-für-Schritt-Dokumentation (🇩🇪)

# 1. Installation und Erster Zugriff

**1.1. Installation von be-BOP**

- **Voraussetzungen:**

    1. **Technische Infrastruktur:**

        - **S3-kompatibler Speicher:** Ein Dienst oder eine Lösung (z. B. MinIO, AWS S3, Scaleway, …) mit der Konfiguration des Buckets (S3_BUCKET, S3_ENDPOINT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_REGION).

        - **MongoDB-Datenbank in ReplicaSet:** Entweder eine lokal konfigurierte ReplicaSet-Instanz oder die Nutzung eines Dienstes wie MongoDB Atlas (Variablen MONGODB_URL und MONGODB_DB).

        - **Node.js-Umgebung:** Node-Version 18 oder höher, mit aktiviertem Corepack (`corepack enable`).

        - **Git LFS installiert:** Zur Verwaltung großer Dateien (Befehl `git lfs install`).

    2. **Konfiguration der Kommunikation:**

        - **SMTP:** Gültige SMTP-Zugangsdaten (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) für den Versand von E-Mails und Benachrichtigungen.

    3. **Sicherheit und Benachrichtigungen (mindestens eine der beiden):**

        - **E-Mail:** Ein E-Mail-Konto, das die SMTP-Konfiguration für den Versand von Benachrichtigungen ermöglicht.

        - **Nostr-Schlüssel (nsec):** Ein NSEC-Schlüssel (kann über die Nostr-Schnittstelle von be-BOP generiert werden).

    4. **Unterstützte Zahlungsmethoden:**

        - Verfügbarkeit mindestens einer von be-BOP unterstützten Zahlungsmethode, wie z. B.:

            - Bitcoin

            - Lightning Network

            - PayPal

            - SumUp

            - Stripe

            - Banküberweisungen und Barzahlungen erfordern eine manuelle Validierung.

    5. **Kenntnis des Mehrwertsteuerregimes:**

        - Es ist unerlässlich, das für Ihre Tätigkeit geltende Mehrwertsteuerregime zu kennen (z. B. Verkauf mit Mehrwertsteuer des Verkäuferlandes, Befreiung mit Nachweis oder Verkauf mit dem Mehrwertsteuersatz des Käuferlandes), um die Rechnungs- und Mehrwertsteuerberechnungsoptionen in be-BOP korrekt zu konfigurieren.

    6. **Konfiguration der Währungen:**

        - Legen Sie klar fest, welche Hauptwährung verwendet werden soll, welche Sekundärwährung (falls zutreffend) und, für einen 100 % BTC-Shop, welche Referenzwährung für die Buchhaltung verwendet werden soll.

    7. **Weitere geschäftliche Voraussetzungen:**

        - Eine klare Vorstellung Ihrer Bestellprozesse, Lagerverwaltung, Versandkostenpolitik sowie der Zahlungs- und Abrechnungsmodalitäten, online und/oder im Geschäft.

        - Kenntnis der gesetzlichen Verpflichtungen (Impressum, Nutzungsbedingungen, Datenschutzrichtlinie) für die Einrichtung der obligatorischen CMS-Seiten.

- **Installation:** Stellen Sie die Anwendung über das offizielle Installationsskript auf Ihrem Server bereit und überprüfen Sie, ob alle Abhängigkeiten korrekt installiert wurden.

**1.2. Erstellung des Super-Admin-Kontos**

- Gehen Sie zu **/admin/login**

- Erstellen Sie Ihr Super-Admin-Konto, indem Sie einen sicheren Benutzernamen und ein Passwort wählen. Bevorzugen Sie eine Passphrase mit drei oder mehr Wörtern.

- Dieses Konto ermöglicht Ihnen den Zugriff auf alle Funktionen des Back-Office.

---

# 2. Absicherung und Konfiguration des Back-Office

**2.1. Absicherung des Zugriffs**

- **Konfiguration des Zugriffshashs:**

    - Gehen Sie über die Administrationsoberfläche zu **/admin/config**.

    - Definieren Sie im Abschnitt für die Sicherung (z. B. „Admin hash“) eine eindeutige Zeichenfolge (Hash).

    - Nach dem Speichern wird die URL des Back-Office geändert (z. B. **/admin-ihrhash/login**), um den Zugriff auf autorisierte Personen zu beschränken.

**2.2. Aktivierung des Wartungsmodus (falls erforderlich)**

- Gehen Sie weiterhin in **/admin/config** (Config > Config über die grafische Oberfläche) und aktivieren Sie die Option **Enable maintenance mode** am unteren Rand der Seite.

- Geben Sie bei Bedarf eine Liste autorisierter IPv4-Adressen (durch Kommas getrennt) an, um den Zugriff auf das Front-Office während der Wartung zu ermöglichen.

- Das Back-Office bleibt für Administratoren zugänglich.

**2.3. Konfiguration der Wiederherstellungszugänge per E-Mail oder Nostr**

- Stellen Sie in **/admin/config** über das ARM-Modul sicher, dass das Super-Admin-Konto eine E-Mail-Adresse oder eine npub für die Wiederherstellung enthält, um das Verfahren bei vergessenem Passwort zu erleichtern.

**2.4. Konfiguration der Sprache oder Mehrsprachigkeit**

- Aktivieren oder deaktivieren Sie in **Admin > Config > Languages** den Sprachwähler, je nachdem, ob Ihre Website mehrsprachig oder einsprachig ist (deaktivieren Sie ihn für eine einsprachige Website).

**2.5. Konfiguration von Layout, Logos und Favicon**

- Gehen Sie zu **Admin > Merch > Layout**, um die obere Leiste, die Navigationsleiste und den Footer zu konfigurieren.

    - Stellen Sie sicher, dass die Option „Display powered by be-BOP“ im Footer aktiviert ist.

    - Vergessen Sie nicht, die Logos für das helle und dunkle Theme sowie das Favicon über **Admin > Merch > Pictures** festzulegen.

---

# 3. Konfiguration der Verkäuferidentität

**3.1. Parametrierung der Identität**

- Gehen Sie zu **/admin/identity** (Config > Identity über die grafische Oberfläche), um alle Informationen zu Ihrem Unternehmen einzugeben:

    - **Firmenname**, **Postadresse**, **Kontakt-E-Mail**, die für den Versand von Rechnungen und offizielle Kommunikation verwendet wird.

    - **Rechnungsinformationen** (optional), die in der oberen rechten Ecke der Rechnungen angezeigt werden.

- **Bankkonto:**

    - Um Zahlungen per Banküberweisung zu aktivieren, geben Sie Ihre IBAN und BIC ein.

**3.2. (Für physische Geschäfte) Anzeige der Geschäftsadresse**

- Für diejenigen mit einem physischen Geschäft, duplizieren Sie die vorherige Konfiguration und fügen Sie in **/admin/identity** (oder über einen dedizierten Abschnitt) die vollständige Adresse des Geschäfts hinzu, damit sie auf Ihren offiziellen Dokumenten und gegebenenfalls im Footer angezeigt wird.

---

# 4. Konfiguration der Währungen

**4.1. Festlegung der Währungen in /admin/config**

- **Hauptwährung:**

    - Diese Währung wird im Front-Office und auf Rechnungen angezeigt.

- **Sekundärwährung (optional):**

    - Kann für die Anzeige oder als Alternative verwendet werden.

- **Referenzwährung für Preise:**

    - Ermöglicht es, Ihre Preise in einer „stabilen“ Währung festzulegen.

    - Achtung: Ein Klick auf den Bestätigungsbutton berechnet die Preise aller Produkte neu, ohne die eingegebenen Beträge zu ändern.

- **Kontowährung:**

    - Wird verwendet, um den Wechselkurs in einem vollständig Bitcoin-basierten be-BOP zu verfolgen.

---

# 5. Konfiguration der Zahlungsmethoden

Sie können die Dauer eines ausstehenden Zahlungsvorgangs im Panel **Admin > Config** festlegen.

**5.1. Bitcoin- und Lightning-Zahlungen**

- **Bitcoin nodeless (onchain):**

    - Gehen Sie zu **Admin > Payment Settings > Bitcoin nodeless** und konfigurieren Sie das Modul, indem Sie den BIP-Standard wählen (derzeit nur BIP84).

    - Geben Sie den öffentlichen Schlüssel (Format **zpub**) ein, der mit einer kompatiblen Wallet (z. B. Sparrow Wallet) generiert wurde.

    - Ändern Sie nicht den Derivationsindex, der bei 0 beginnt und automatisch hochgezählt wird.

    - Konfigurieren Sie die URL eines Block-Explorers zur Überprüfung von Transaktionen (z. B. `https://mempool.space`).

- **PhoenixD für Lightning:**

    - Installieren Sie PhoenixD auf Ihrem Server gemäß den Anweisungen unter [https://phoenix.acinq.co/server/get-started](https://phoenix.acinq.co/server/get-started).

    - Gehen Sie zu **Admin > Payment Settings > PhoenixD**, geben Sie die URL Ihrer Instanz ein (beachten Sie bei Docker die Netzwerkspezifika) und fügen Sie das HTTP-Passwort von PhoenixD hinzu. Wenn Sie PhoenixD auf demselben Server wie Ihr be-BOP installieren, klicken Sie auf den Button Detect PhoenixD Server.

**Für Power-User**

Es ist möglich, einen vollständigen Bitcoin-Knoten sowie LND über die .env-Datei und RPC-Zugangsdaten (+TOR empfohlen) für einen entfernten Knoten zu nutzen. Alternativ können Sie Bitcoin Core und LND im selben lokalen Netzwerk wie Ihr be-BOP installieren.

- **Bitcoin Core:**

    - In **Admin > Payment Settings > Bitcoin core node**

- **Lightning LND:**

    - In **Admin > Payment Settings > Lightning LND node**

**5.2. Zahlung per PayPal**

- Gehen Sie zu **Admin > Payment Settings > Paypal** und geben Sie Ihre Client ID und Secret ein, die Sie von Ihrem PayPal-Entwicklerkonto erhalten haben. [https://developer.paypal.com/api/rest/](https://developer.paypal.com/api/rest/)

- Aktivieren Sie **Those credentials are for the sandbox environment**, wenn Sie den Sandbox-Modus (zum Testen) verwenden möchten, oder lassen Sie die Standardeinstellung für den Produktionsmodus.

**5.3. Zahlung per SumUp**

- Gehen Sie zu **Admin > Payment Settings > SumUp** und geben Sie Ihre API Key und Merchant Code ein. [https://developer.sumup.com/api](https://developer.sumup.com/api)

- Die verwendete Währung entspricht der Ihres SumUp-Kontos (in der Regel die Währung des Landes Ihres Unternehmens).

**5.4. Zahlung per Stripe**

- Gehen Sie zu **Admin > Payment Settings > Stripe** und geben Sie Ihre Secret Key und Public Key ein. [https://docs.stripe.com/api](https://docs.stripe.com/api)

- Die verwendete Währung entspricht der Ihres Stripe-Kontos (in der Regel die Währung des Landes Ihres Unternehmens).

---

# 6. Produktverwaltung

**6.1. Erstellung eines neuen Produkts**

- Gehen Sie zu **Admin > Merch > Products**, um ein Produkt hinzuzufügen oder zu bearbeiten.

- **Grundlegende Informationen:**

    - Geben Sie den **Product name**, den **slug** (eindeutiger Bezeichner für die URL) und, falls erforderlich, ein **alias** ein, um das Hinzufügen über das entsprechende Feld im Warenkorb zu erleichtern. Für Produkte, die für den Online-Verkauf (außer Point of Sale) gedacht sind, ist ein Alias nicht erforderlich.

- **Preisgestaltung:**

    - Legen Sie den Preis in **Price Amount** fest und wählen Sie die Währung in **Price Currency**. Sie können auch kostenlose Produkte oder Produkte mit freiem Preis erstellen, indem Sie die entsprechenden Produktoptionen unten aktivieren: **This is a free product** und **This is a pay-what-you-want product**.

    - **Produktoptionen:**

    - Geben Sie an, ob das Produkt eigenständig ist (einmalige Hinzufügung pro Bestellung) oder ein Produkt mit Variationen (z. B. ein T-Shirt in S, M, L und XL ist nicht eigenständig).

    - Für Produkte mit Variationen, wie im obigen Beispiel, aktivieren Sie die Option **Product has light variations (no stock difference)** und fügen Sie die Variationen hinzu (Name, Wert und Preisunterschied).

**6.2. Lagerverwaltung**

- Für ein Produkt mit begrenztem Lagerbestand aktivieren Sie **The product has a limited stock** und geben Sie die verfügbare Menge ein.

- Das System zeigt auch den reservierten Bestand (in ausstehenden Bestellungen) und den verkauften Bestand an.

- Sie können den Wert in Minuten für die Dauer, in der ein Produkt als im Warenkorb reserviert gilt, in **Admin > Config** ändern.

---

# 7. Erstellung und Anpassung von CMS-Seiten und Widgets

**7.1. Obligatorische CMS-Seiten**

- Erstellen Sie in **Admin > Merch > CMS** die wesentlichen Seiten, wie z. B.:

    - `/home` (Startseite),

    - `/error` (Fehlerseite),

    - `/maintenance` (Wartungsseite),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (rechtliche und informative Pflichtseiten).

- Diese Seiten dienen dazu, Ihren Besuchern rechtliche Informationen, Kontaktmöglichkeiten und Erläuterungen zum Funktionieren Ihres Shops bereitzustellen.

- Sie können beliebig viele weitere Seiten hinzufügen.

**7.2. Layout und grafische Elemente**

- Gehen Sie zu **Admin > Merch > Layout**, um die obere Leiste, die Navigationsleiste und den Footer anzupassen.

- Bearbeiten Sie Links, Logos (über **Admin > Merch > Pictures**) und die Beschreibung Ihrer Website.

**7.3. Integration von Widgets in CMS-Seiten**

- Sie können verschiedene Widgets in **Admin > Widgets** erstellen: Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries und Leaderboards.

- Verwenden Sie spezifische Tags, um dynamische Elemente zu integrieren, z. B.:

    - Um ein Produkt anzuzeigen: `[Product=slug?display=img-1]`

    - Um ein Bild anzuzeigen: `[Picture=slug width=100 height=100 fit=contain]`

    - Um einen Slider einzubinden: `[Slider=slug?autoplay=3000]`

    - Um eine Herausforderung, einen Countdown, ein Formular usw. hinzuzufügen, verwenden Sie jeweils `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`.

---

# 8. Verwaltung von Bestellungen und Berichterstellung

**8.1. Nachverfolgung von Bestellungen**

- In **Admin > Transaction > Orders** können Sie die Liste der Bestellungen einsehen.

- Verwenden Sie die verfügbaren Filter (Bestellnummer, Produktalias, Zahlungsmethode, E-Mail usw.), um Ihre Suche zu verfeinern.

- Sie können die Details einer Bestellung einsehen (bestellte Produkte, Kundeninformationen, Lieferadresse) und den Status der Bestellung verwalten (bestätigen, stornieren, Labels hinzufügen, Bestellnotizen einsehen).

**8.2. Berichterstellung und Export**

- Gehen Sie zu **Admin > Config > Reporting**, um monatliche und jährliche Statistiken zu Bestellungen, Produkten und Zahlungen einzusehen.

- Jeder Abschnitt (Bestelldetails, Produktdetails, Zahlungsdetails) bietet einen **Export CSV**-Button zum Herunterladen der Daten.

---

# 9. Konfiguration der Nostr-Messaging (optional)

**9.1. Konfiguration des Nostr-Schlüssels**

- Gehen Sie zu **Admin > Node Management > Nostr** und klicken Sie auf **Nsec erstellen**, wenn Sie noch keinen besitzen.  
    **HINWEIS:** Wenn Sie bereits einen Nsec über einen Nostr-Client generiert und in Ihrer .env-Datei eingetragen haben, können Sie diesen Schritt überspringen.

- Kopieren Sie den von Ihnen oder be-BOP generierten NSEC-Schlüssel und fügen Sie ihn in Ihre **.env.local**-Datei unter der Variable `NOSTR_PRIVATE_KEY` ein.

**9.2. Zugehörige Funktionen**

- Diese Konfiguration ermöglicht das Senden von Benachrichtigungen über Nostr, die Aktivierung des leichten Administrationsclients und das Angebot passwortloser Anmeldungen über temporäre Links.

---

# 10. Anpassung von Design und Themes

- Gehen Sie zu **Admin > Merch > Theme**, um ein Theme zu erstellen, indem Sie Farben, Schriftarten und Stile für die Elemente des Headers, Bodys, Footers usw. definieren.

- Wenden Sie das erstellte Theme als aktives Theme für Ihren Shop an.

---

# 11. Konfiguration von E-Mail-Vorlagen

- Gehen Sie zu **Admin > Config > Templates**, um E-Mail-Vorlagen zu konfigurieren (z. B. für Passwortzurücksetzung, Bestellbenachrichtigungen usw.).

- Geben Sie für jede Vorlage den **Subject** und den **HTML body** ein.

- Die Vorlagen unterstützen Variablen wie `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}` usw.

---

# Um weiter zu gehen...

# 12. Konfiguration von Tags und spezifischen Widgets

**12.1. Verwaltung von Tags**

- Gehen Sie zu **Admin > Widgets > Tag**, um Tags zu erstellen, mit denen Sie Ihre Produkte organisieren oder Ihre CMS-Seiten bereichern können.

- Geben Sie den **Tag name**, den **slug**, die **Tag Family** (Creators, Retailers, Temporal, Events) sowie optionale Felder (Titel, Untertitel, kurzer und vollständiger Inhalt, CTAs) ein.

**12.2. Integration über CMS**

- Um einen Tag in eine Seite zu integrieren, verwenden Sie die Syntax:
    `[Tag=slug?display=var-1]`

# 13. Konfiguration von herunterladbaren Dateien

**Hinzufügen einer Datei**

- Gehen Sie zu **Admin > Merch > Files** und klicken Sie auf **New file**.

- Geben Sie den **Dateinamen** ein (z. B. „Produktbeschreibung“) und laden Sie die Datei über den Button **Durchsuchen…** hoch.

- Nach dem Hinzufügen wird ein permanenter Link generiert, der in Ihren CMS-Seiten verwendet werden kann, um die Datei zu teilen.

# 14. Nostr-Bot

In der Sektion **Node Management > Nostr** können Sie Ihre Nostr-Schnittstelle konfigurieren, die das Senden von Benachrichtigungen und die Interaktion mit Ihren Kunden ermöglicht. Zu den verfügbaren Optionen gehören:

- Verwaltung der Liste der von Ihrem Nostr-Bot verwendeten Relays.

- Aktivieren oder Deaktivieren der automatischen Begrüßungsnachricht des Bots.

- Zertifizierung Ihrer npub durch Hinzufügen eines Logos, eines Namens und einer Domäne (Alias Lightning BOLT12 für Zaps).

# 15. Überschreibung von Übersetzungslabels

Obwohl be-BOP in mehreren Sprachen verfügbar ist (Englisch, Französisch, Spanisch usw.), können Sie die Übersetzungen an Ihre Bedürfnisse anpassen. Gehen Sie dazu zu **Config > Languages**, wo Sie die JSON-Übersetzungsdateien laden und bearbeiten können. Diese Dateien für jede Sprache finden Sie in unserem offiziellen Repository unter:  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations)

---

# TEIL 2 Teamarbeit und POS

# 1. Verwaltung von Benutzern und Zugriffsrechten

**1.1. Erstellung von Rollen**

- Gehen Sie zu **Admin > Config > ARM** und klicken Sie auf **Create a role**, um Rollen zu definieren (z. B. Super Admin, Point of Sale, Ticketprüfer).

- Geben Sie für jede Rolle an:

    - Die Zugriffspfade für **write access** und **read access**.

    - Die verbotenen Pfade über **Forbidden access**.

**1.2. Benutzerverwaltung**

- Gehen Sie zu **Admin > Users**, um Benutzer zu erstellen oder zu bearbeiten, und geben Sie ein:

    - Den **Login**, das **Alias**, die **Wiederherstellungs-E-Mail** und gegebenenfalls die **Recovery npub**.

    - Weisen Sie jedem Benutzer die passende Rolle zu.

- Benutzer mit Nur-Lese-Zugriff sehen die Menüs in Kursivschrift und können keine Änderungen vornehmen.

# 2. Konfiguration des Point of Sale (POS) für den Verkauf im Geschäft

**2.1. Zuweisung und Zugriff auf POS**

- Weisen Sie die Rolle **Point of Sale (POS)** über **Admin > Config > ARM** dem für die Kasse verantwortlichen Benutzer zu.

- POS-Benutzer melden sich über die sichere Anmeldeseite an und werden zur dedizierten Oberfläche weitergeleitet (z. B. **/pos** oder **/pos/touch**).

**2.2. Spezifische POS-Funktionen**

- **Schnelles Hinzufügen über Alias:** In **/cart** ermöglicht das Feld zum Hinzufügen per Alias das Scannen eines Barcodes (ISBN, EAN13), um das Produkt direkt hinzuzufügen.

- **POS-Zahlungsoptionen:**

    - Möglichkeit, Multi-Mode-Zahlungen zu verwalten (Bar, Karte, Lightning usw.).

    - Spezifische Optionen für Mehrwertsteuerbefreiung oder Geschenkrabatte mit verpflichtender Eingabe einer managerialen Begründung.

- **Anzeige für den Kunden:**

    - Zeigen Sie auf einem dedizierten Bildschirm (z. B. Tablet oder externer Monitor über HDMI) die Seite **/pos/session** an, damit der Kunde den Fortschritt seiner Bestellung verfolgen kann.