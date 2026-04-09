# Documentatie Rapportage-interface

Deze pagina stelt u in staat om details over bestellingen, producten en betalingen te raadplegen en te exporteren. De pagina is toegankelijk via het tabblad **Admin** > **Config** > **Reporting**.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

De pagina toont de rapportage van de huidige maand en het huidige jaar.

---

## Functies

### 1. Rapportagefilters

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Filteropties**: Hiermee kunt u bestellingen filteren op hun status:
  - `Include pending orders`: Lopende bestellingen opnemen.
  - `Include expired orders`: Verlopen bestellingen opnemen.
  - `Include canceled orders`: Geannuleerde bestellingen opnemen.
  - `Include partially paid orders`: Gedeeltelijk betaalde bestellingen opnemen.
- **Gebruik**: Vink de corresponderende vakjes aan om deze soorten bestellingen op te nemen in de rapportage.
  Standaard worden alleen betaalde bestellingen weergegeven.

### 2. Order Detail (Bestelgegevens)

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Export CSV**: Hiermee kunt u de bestelgegevens exporteren in CSV-formaat.
- **Tabel met bestelgegevens**:
  - Toont informatie over bestellingen. Elke regel vertegenwoordigt een bestelling.
  - `Order ID`: Unieke identificatie van de bestelling (klik erop voor meer details).
  - `Order URL`: Directe link naar de bestelling.
  - `Order Date`: Datum van de bestelling.
  - `Order Status`: Status van de bestelling (bijv. paid, pending).
  - `Currency`: Valuta van de transactie.
  - `Amount`: Totaalbedrag van de bestelling.
  - `Billing Country`: Land van facturering (indien beschikbaar).
  - `Billing Info`: Informatie voor het factuuradres.
  - `Shipping Country`: Land van levering (indien beschikbaar).
  - `Shipping Info`: Informatie voor het leveringsadres.
  - `Cart`: De artikelen in het winkelwagentje van de bestelling.

### 3. Product Detail (Productgegevens)

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Export CSV**: Hiermee kunt u productinformatie die aan bestellingen is gekoppeld exporteren in CSV-formaat.
- **Tabel met productgegevens**:
  - Toont informatie over producten die aan bestellingen zijn gekoppeld. Elke regel komt overeen met een product dat aan een specifieke bestelling is toegevoegd.
  - `Product URL`: Directe link naar het product.
  - `Product Name`: Naam van het product.
  - `Quantity`: Bestelde hoeveelheid.
  - `Deposit`: Aanbetalingsbedrag voor het product (indien van toepassing).
  - `Order ID`: Referentie van de bijbehorende bestelling.
  - `Order Date`: Datum van de bijbehorende bestelling.
  - `Currency`: Valuta van de transactie.
  - `Amount`: Totaalbedrag voor dit product.
  - `Vat Rate`: Toegepast btw-tarief.

### 4. Payment Detail (Betalingsgegevens)

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Export CSV**: Hiermee kunt u betalingsgegevens exporteren in CSV-formaat.
- **Tabel met betalingsgegevens**:
  - Toont informatie over betalingen die aan bestellingen zijn gekoppeld. Elke regel komt overeen met een betaling die voor een specifieke bestelling is uitgevoerd.
  - `Order ID`: Referentie van de bijbehorende bestelling.
  - `Invoice ID`: Factuurreferentie.
  - `Payment Date`: Betalingsdatum.
  - `Order Status`: Status van de bestelling.
  - `Payment mean`: Betaalmiddel.
  - `Payment Status`: Status van de betaling.
  - `Payment Info`: Betalingsinformatie.
  - `Order Status`: Status van de bestelling.
  - `Invoice`: Factuurnummer.
  - `Currency`: Valuta die door de winkel wordt gebruikt.
  - `Amount`: Het betalingsbedrag omgerekend met de valuta.
  - `Cashed Currency`: Betalingsvaluta.
  - `Cashed Amount`: Het betalingsbedrag omgerekend met de betalingsvaluta.
  - `Billing Country`: Land van facturering.

### 5. Rapportagefilter

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Wordt gebruikt om de rapportage te filteren op de gekozen maand en jaar.

### 6. Order synthesis (Besteloverzicht)

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Export CSV**: Hiermee kunt u het besteloverzicht exporteren in CSV-formaat.
- **Overzichtstabel**:
  - Toont een samenvatting van bestelstatistieken voor een bepaalde periode.
  - `Period`: Geeft de maand en het jaar van de betreffende periode aan.
  - `Order Quantity`: Totaal aantal geplaatste bestellingen in deze periode.
  - `Order Total`: Cumulatief bedrag van alle bestellingen voor de aangegeven periode.
  - `Average Cart`: Gemiddeld bestelbedrag voor deze periode.
  - `Currency`: Valuta waarin de bestellingen zijn geplaatst (bijvoorbeeld BTC voor Bitcoin).

### 7. Product synthesis (Productoverzicht)

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Export CSV**: Hiermee kunt u het productoverzicht exporteren in CSV-formaat.
- **Overzichtstabel**:
  - Toont een samenvatting van productstatistieken voor een bepaalde periode.
  - `Period`: Geeft de maand en het jaar van de betreffende periode aan.
  - `Product ID`: ID van het product.
  - `Product Name`: Naam van het product.
  - `Order Quantity`: Bestelde hoeveelheid.
  - `Currency`: Valuta waarin de bestellingen zijn geplaatst (bijvoorbeeld BTC voor Bitcoin).
  - `Total Price`: Totaal van de bestelling (bijvoorbeeld BTC voor Bitcoin).

### 8. Payment synthesis (Betalingsoverzicht)

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Export CSV**: Hiermee kunt u het betalingsoverzicht exporteren in CSV-formaat.
- **Overzichtstabel**:
  - Toont een samenvatting van betalingsstatistieken voor een bepaalde periode.
  - `Period`: Geeft de maand en het jaar van de betreffende periode aan.
  - `Payment Mean`: Het gebruikte betaalmiddel.
  - `Payment Quantity`: Het betaalde aantal.
  - `Total Price`: De totaal betaalde prijs.
  - `Currency`: Valuta waarin de bestellingen zijn geplaatst (bijvoorbeeld BTC voor Bitcoin).
  - `Currency`: Valuta waarin de bestellingen zijn geplaatst (bijvoorbeeld BTC voor Bitcoin).
  - `Average`: Gemiddeld betaald bedrag.

---

## Gegevens exporteren

Elke sectie (Order Detail, Product Detail, Payment Detail) heeft een knop `Export CSV` waarmee u de weergegeven gegevens als CSV-bestand kunt downloaden.

Een voorbeeld:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
