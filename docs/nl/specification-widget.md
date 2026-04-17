# Documentatie Specificatie Widget

Toegankelijk via **Admin** > **Widgets** > **Specifications**, de specificatie-widgets kunnen in uw be-BOP worden gebruikt om specificaties te integreren in CMS-zones of -pagina's. Deze widget kan worden gebruikt om de specificaties van uw artikelen in uw be-BOP te vermelden.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Een specificatie aanmaken

Om een specificatie toe te voegen, klikt u op **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Titel

- Voer een titel in die de specificaties beschrijft.

### 2. Slug

- Geef een unieke identificatie op.
  Deze slug wordt gebruikt als unieke sleutel voor interne referenties of URL's.

### 3. Inhoud

- Voer de inhoud in als een gestructureerde CSV-tabel met de volgende kolommen:
  - **Categorie**: De groep waartoe de specificatie behoort.
  - **Label**: Specifieke naam van de eigenschap.
  - **Waarde**: Detail van de specificatie.

#### Voorbeeld van inhoud voor een horloge:

```csv
"Kast en wijzerplaat";"Metaal";"18 karaat roségoud"
"Kast en wijzerplaat";"Kastdiameter";"41"
"Kast en wijzerplaat";"Dikte";"9.78 mm"
"Kast en wijzerplaat";"Diamanten (karaat)";"10.48"
"Kast en wijzerplaat";"Wijzerplaat";"in 18 karaat roségoud volledig bezet met diamanten"
"Kast en wijzerplaat";"Waterdichtheid";"100 meter"
"Kast en wijzerplaat";"Bodem";"saffierglas"
"Uurwerk";"Uurwerk";"Chopard 01.03-C"
"Uurwerk";"Type opwinding";"mechanisch uurwerk met automatische opwinding"
"Uurwerk";"Functie";"uren en minuten"
"Uurwerk";"Gangreserve";"Gangreserve van ongeveer 60 uur"
"Uurwerk";"Frequentie";"4 Hz (28.800 trillingen per uur)"
"Uurwerk";"Spiraal";"plat"
"Uurwerk";"Balans";"met drie armen"
"Uurwerk";"Afmetingen uurwerk";"diameter 28.80 mm"
"Uurwerk";"Dikte uurwerk";"4.95 mm"
"Uurwerk";"Aantal componenten uurwerk";"182"
"Uurwerk";"Robijnen";"27"
"Band en sluiting";"Type sluiting";"vouwsluiting"
"Band en sluiting";"Materiaal sluiting";"18 karaat roségoud"

```

## CMS-integratie

Om een specificatie toe te voegen aan een CMS-zone kunt u `[Specification=slug]` gebruiken

- Voorbeeld in een CMS-zone van een product.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  En wanneer het product wordt weergegeven ziet u
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
