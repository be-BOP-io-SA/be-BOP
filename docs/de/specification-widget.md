# Spezifikations-Widget-Dokumentation

Zugänglich über **Admin** > **Widgets** > **Specifications**, Spezifikations-Widgets können in Ihrem be-BOP verwendet werden, um Spezifikationen in CMS-Zonen oder -Seiten zu integrieren. Dieses Widget kann verwendet werden, um Spezifikationen für Ihre Artikel in Ihrem be-BOP bereitzustellen.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Eine Spezifikation erstellen

Um eine Spezifikation hinzuzufügen, klicken Sie auf **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Title

- Geben Sie einen Titel ein, der die Spezifikationen beschreibt.

### 2. Slug

- Geben Sie einen eindeutigen Bezeichner an.
  Dieser Slug wird als eindeutiger Schlüssel für interne Referenzen oder URLs verwendet.

### 3. Content

- Füllen Sie den Inhalt als strukturierte CSV-Tabelle mit folgenden Spalten aus:
  - **Category**: Die Gruppe, zu der die Spezifikation gehört.
  - **Label**: Spezifischer Name der Eigenschaft.
  - **Value**: Spezifikationsdetail.

#### Beispielinhalt für eine Uhr:

```csv
"Gehäuse und Zifferblatt";"Metall";"18-Karat Roségold"
"Gehäuse und Zifferblatt";"Gehäusedurchmesser";"41"
"Gehäuse und Zifferblatt";"Dicke";"9,78 mm"
"Gehäuse und Zifferblatt";"Diamanten (Karat)";"10,48"
"Gehäuse und Zifferblatt";"Zifferblatt";"18-Karat Roségold vollständig mit Diamanten besetzt"
"Gehäuse und Zifferblatt";"Wasserdichtigkeit";"100 Meter"
"Gehäuse und Zifferblatt";"Gehäuseboden";"Saphirglas"
"Uhrwerk";"Uhrwerk";"Chopard 01.03-C"
"Uhrwerk";"Aufzugsart";"Mechanisches Uhrwerk mit automatischem Aufzug"
"Uhrwerk";"Funktion";"Stunden und Minuten"
"Uhrwerk";"Gangreserve";"Gangreserve von ca. 60 Stunden"
"Uhrwerk";"Frequenz";"4 Hz (28.800 Schwingungen pro Stunde)"
"Uhrwerk";"Spiralfeder";"flach"
"Uhrwerk";"Unruh";"dreiarmig"
"Uhrwerk";"Uhrwerkabmessungen";"Ø 28,80 mm"
"Uhrwerk";"Uhrwerkdicke";"4,95 mm"
"Uhrwerk";"Anzahl Uhrwerkkomponenten";"182"
"Uhrwerk";"Lagersteine";"27"
"Armband und Schließe";"Schließentyp";"Faltschließe"
"Armband und Schließe";"Schließenmaterial";"18-Karat Roségold"

```

## CMS-Integration

Um eine Spezifikation zu einer CMS-Zone hinzuzufügen, verwenden Sie `[Specification=slug]`.

- Beispiel in einer Produkt-CMS-Zone.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  Und bei der Anzeige des Produkts sehen Sie:
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
