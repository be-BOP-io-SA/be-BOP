# Dokumentation der Reporting-Oberfläche

Diese Seite ermöglicht es Ihnen, Details zu Bestellungen, Produkten und Zahlungen anzuzeigen und zu exportieren. Sie ist über **Admin** > **Config** > **Reporting** erreichbar.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

Sie zeigt das Reporting für den aktuellen Monat und das aktuelle Jahr an.

---

## Funktionen

### 1. Reporting-Filter

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Filteroptionen**: Ermöglicht das Filtern von Bestellungen nach ihrem Status:
  - `Include pending orders`: Ausstehende Bestellungen einbeziehen.
  - `Include expired orders`: Abgelaufene Bestellungen einbeziehen.
  - `Include canceled orders`: Stornierte Bestellungen einbeziehen.
  - `Include partially paid orders`: Teilweise bezahlte Bestellungen einbeziehen.
- **Verwendung**: Aktivieren Sie die entsprechenden Kontrollkästchen, um diese Bestelltypen in den Bericht aufzunehmen.
  Standardmäßig werden nur bezahlte Bestellungen aufgelistet.

### 2. Bestelldetails

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Export CSV**: Ermöglicht den Export von Bestelldetails im CSV-Format.
- **Bestelldetail-Tabelle**:
  - Zeigt Bestellinformationen an. Jede Zeile repräsentiert eine Bestellung.
  - `Order ID`: Eindeutige Bestellkennung (klicken Sie für weitere Details).
  - `Order URL`: Direktlink zur Bestellung.
  - `Order Date`: Bestelldatum.
  - `Order Status`: Bestellstatus (z.B. bezahlt, ausstehend).
  - `Currency`: Transaktionswährung.
  - `Amount`: Gesamtbestellbetrag.
  - `Billing Country`: Rechnungsland (falls verfügbar).
  - `Billing Info`: Rechnungsadressinformationen.
  - `Shipping Country`: Versandland (falls verfügbar).
  - `Shipping Info`: Versandadressinformationen.
  - `Cart`: Artikel im Warenkorb der Bestellung.

### 3. Produktdetails

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Export CSV**: Ermöglicht den Export von Produktinformationen zu Bestellungen im CSV-Format.
- **Produktdetail-Tabelle**:
  - Zeigt Informationen zu Produkten an, die mit Bestellungen verknüpft sind. Jede Zeile entspricht einem Produkt, das für eine bestimmte Bestellung hinzugefügt wurde.
  - `Product URL`: Direktlink zum Produkt.
  - `Product Name`: Produktname.
  - `Quantity`: Bestellte Menge.
  - `Deposit`: Anzahlungsbetrag für das Produkt (falls zutreffend).
  - `Order ID`: Zugehörige Bestellreferenz.
  - `Order Date`: Zugehöriges Bestelldatum.
  - `Currency`: Transaktionswährung.
  - `Amount`: Gesamtbetrag für dieses Produkt.
  - `Vat Rate`: Angewendeter MwSt.-Satz.

### 4. Zahlungsdetails

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Export CSV**: Ermöglicht den Export von Zahlungsdetails im CSV-Format.
- **Zahlungsdetail-Tabelle**:
  - Zeigt Zahlungsinformationen zu Bestellungen an. Jede Zeile entspricht einer Zahlung für eine bestimmte Bestellung.
  - `Order ID`: Zugehörige Bestellreferenz.
  - `Invoice ID`: Rechnungsreferenz.
  - `Payment Date`: Zahlungsdatum.
  - `Order Status`: Bestellstatus.
  - `Payment mean`: Zahlungsmethode.
  - `Payment Status`: Zahlungsstatus.
  - `Payment Info`: Zahlungsinformationen.
  - `Order Status`: Bestellstatus.
  - `Invoice`: Rechnungsnummer.
  - `Currency`: Shop-Währung.
  - `Amount`: Zahlungsbetrag umgerechnet in die Währung.
  - `Cashed Currency`: Zahlungswährung.
  - `Cashed Amount`: Zahlungsbetrag umgerechnet in die Zahlungswährung.
  - `Billing Country`: Rechnungsland.

### 5. Reporting-Filter

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Wird verwendet, um das Reporting nach ausgewähltem Monat und Jahr zu filtern.

### 6. Bestellübersicht

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Export CSV**: Ermöglicht den Export der Bestellübersicht im CSV-Format.
- **Übersichtstabelle**:
  - Zeigt eine Zusammenfassung der Bestellstatistiken für einen bestimmten Zeitraum.
  - `Period`: Gibt den Monat und das Jahr des Zeitraums an.
  - `Order Quantity`: Gesamtzahl der Bestellungen in diesem Zeitraum.
  - `Order Total`: Kumulierter Betrag aller Bestellungen für den angegebenen Zeitraum.
  - `Average Cart`: Durchschnittlicher Bestellbetrag für diesen Zeitraum.
  - `Currency`: Währung, in der die Bestellungen aufgegeben wurden (z.B. BTC für Bitcoin).

### 7. Produktübersicht

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Export CSV**: Ermöglicht den Export der Produktübersicht im CSV-Format.
- **Übersichtstabelle**:
  - Zeigt eine Zusammenfassung der Produktstatistiken für einen bestimmten Zeitraum.
  - `Period`: Gibt den Monat und das Jahr des Zeitraums an.
  - `Product ID`: Produkt-ID.
  - `Product Name`: Produktname.
  - `Order Quantity`: Bestellte Menge.
  - `Currency`: Währung, in der die Bestellungen aufgegeben wurden (z.B. BTC für Bitcoin).
  - `Total Price`: Bestellsumme (z.B. BTC für Bitcoin).

### 8. Zahlungsübersicht

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Export CSV**: Ermöglicht den Export der Zahlungsübersicht im CSV-Format.
- **Übersichtstabelle**:
  - Zeigt eine Zusammenfassung der Zahlungsstatistiken für einen bestimmten Zeitraum.
  - `Period`: Gibt den Monat und das Jahr des Zeitraums an.
  - `Payment Mean`: Die verwendete Zahlungsmethode.
  - `Payment Quantity`: Die bezahlte Menge.
  - `Total Price`: Der gezahlte Gesamtpreis.
  - `Currency`: Währung, in der die Bestellungen aufgegeben wurden (z.B. BTC für Bitcoin).
  - `Currency`: Währung, in der die Bestellungen aufgegeben wurden (z.B. BTC für Bitcoin).
  - `Average`: Durchschnittlich gezahlter Betrag.

---

## Datenexport

Jeder Abschnitt (Bestelldetails, Produktdetails, Zahlungsdetails) verfügt über eine Schaltfläche `Export CSV`, um die angezeigten Daten als CSV-Datei herunterzuladen.

Ein Beispiel:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
