# Dokumentation der POS-Touchscreen-Verwaltungsoberfläche

Diese Dokumentation beschreibt die Funktionen der Touch-Oberfläche (POS Touch Screen) zur Auswahl und Verwaltung von Artikeln im Warenkorb.

---

## Allgemeine Übersicht

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

Die Oberfläche ist in mehrere Bereiche unterteilt, um die Verkaufsverwaltung zu erleichtern:

1. **Warenkorb**: Zeigt die vom Kunden ausgewählten Artikel an.
2. **Favoriten und Artikel-Tags**: Ermöglicht schnelles Auffinden von Artikeln.
3. **Alle Artikel**: Zeigt alle verfügbaren Artikel an.
4. **Aktionen**: Schaltflächen zur Verwaltung des Warenkorbs und zum Abschließen des Verkaufs.

---

## Konfiguration

In admin/tag ist pos-favorite ein Tag, das erstellt werden muss, um Artikel standardmäßig als Favoriten auf der /pos/touch-Oberfläche anzuzeigen.

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

In admin/config/pos können Sie Tags hinzufügen, die als Menüs auf /pos/touch dienen.

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Bereichsbeschreibungen

### 1. Warenkorb

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Anzeige**: Auf der linken Seite der Oberfläche zeigt dieser Bereich die aktuell im Warenkorb befindlichen Artikel an.
- **Anfangszustand**: Zeigt "Cart is empty" an, wenn keine Artikel hinzugefügt wurden.
- **Funktionalität**: Ermöglicht die Anzeige hinzugefügter Artikel mit Menge und Gesamtpreis.
- **Zum Warenkorb hinzufügen**: Um auf einem Kassenbildschirm zum Warenkorb hinzuzufügen, klicken Sie einfach auf den Artikel.

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  Und der Artikel wird zum Warenkorb hinzugefügt und im Kassenbon-Block angezeigt.

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  Wenn ein Artikel zum Warenkorb hinzugefügt wurde, können Sie eine Notiz hinzufügen, indem Sie auf den Artikelnamen klicken.

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)

  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Favoriten und Artikel-Tags

- **Favoriten**: Der Bereich `Favorites` oben in der Oberfläche zeigt eine Liste von als Favoriten markierten Artikeln für schnellen Zugriff.

  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Favoriten verwalten**: Sie können Artikel bei deren Erstellung als Favoriten markieren, um den späteren Zugriff zu erleichtern.

- **Artikel-Tags**: Der Bereich unter "Favorites" zeigt eine Liste von Artikeln, die nach verschiedenen Tags organisiert sind.

  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. Alle Artikel

- **Artikelanzeige**: Zeigt eine Liste aller im System verfügbaren Artikel, organisiert mit Bildern und Artikelnamen.

  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Aktionen

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

Dieser Bereich gruppiert die Schaltflächen zur Verwaltung des Warenkorbs, zum Speichern oder zum Abschließen eines Verkaufs:

- **Tickets**: Zugriff auf aktuelle Verkaufstickets.
- **Pay**: Leitet zur /checkout-Seite weiter, um den Verkauf der Artikel im Warenkorb abzuschließen und die Transaktion zu erfassen.

  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)

- **Save**: Speichert den aktuellen Warenkorbzustand oder Einstellungsänderungen.
- **Pool**: Kann zum Aufteilen der Bestellung, zur Verwaltung von Artikelgruppen oder zur Zuordnung von Kunden zu einer bestimmten Bestellung verwendet werden.
- **Open Drawer**: Öffnet die Kassenschublade für den Zugriff auf Bargeld (erfordert ein angeschlossenes physisches System).
- **🗑️**: Ermöglicht das Leeren des Warenkorbs.

  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)

- **❎**: Ermöglicht das Entfernen der letzten Zeile aus dem Warenkorb.

  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Theme

Standardmäßig verwendet der POS Touch Screen das in den vorherigen Screenshots gezeigte Design, aber es ist möglich, dieses Design zu ändern, indem Sie das Theme unter **Admin** > **Merch** > **Themes** ändern.

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
