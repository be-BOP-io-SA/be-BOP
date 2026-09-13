# Documentatie POS Touchscreen-interface

Deze documentatie beschrijft de functionaliteiten van de touchscreen-interface (POS Touch Screen) van de kassa voor het selecteren en beheren van artikelen in het winkelwagentje.

---

## Algemeen overzicht

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

De interface is verdeeld in meerdere secties om het verkoopbeheer te vergemakkelijken:

1. **Winkelwagen**: Toont de door de klant geselecteerde artikelen.
2. **Favorieten en artikel-tags**: Maakt het mogelijk artikelen snel terug te vinden.
3. **Alle artikelen**: Toont alle beschikbare artikelen.
4. **Acties**: Knoppen voor het beheren van de winkelwagen en het afronden van de verkoop.

---

## Configuratie

Op admin/tag is pos-favorite een tag die moet worden aangemaakt om standaard artikelen als favorieten weer te geven in de /pos/touch-interface.

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

Op admin/config/pos kunt u tags toevoegen die als menu's dienen op /pos/touch.

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Beschrijving van de secties

### 1. Winkelwagen

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Weergave**: Bevindt zich aan de linkerkant van de interface en toont de artikelen die momenteel in de winkelwagen zitten.
- **Begintoestand**: Toont "Het winkelwagentje is leeg" wanneer er geen artikelen zijn toegevoegd.
- **Functionaliteit**: Maakt het mogelijk de toegevoegde artikelen te bekijken, evenals hun hoeveelheid en totaalprijs.
- **Toevoegen aan winkelwagen**: Om een artikel toe te voegen op een point-of-sale-scherm, klikt u simpelweg op het artikel.

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  en het artikel wordt toegevoegd aan de winkelwagen en weergegeven op het ticketblok

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  wanneer een artikel aan de winkelwagen is toegevoegd, kunt u een notitie toevoegen door op de naam van het artikel te klikken

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)

  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Favorieten en artikel-tags

- **Favorieten**: De sectie `Favorieten` bovenaan de interface presenteert een lijst van artikelen die als favoriet zijn gemarkeerd voor snelle toegang.

  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Favorieten beheren**: U kunt artikelen bij het aanmaken als favoriet markeren om latere toegang te vergemakkelijken.

- **Artikel-tags**: De sectie onder "Favorieten" presenteert een lijst van artikelen volgens verschillende tags.

  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. Alle artikelen

- **Artikelweergave**: Presenteert een lijst van alle beschikbare artikelen in het systeem, georganiseerd met afbeeldingen en artikelnamen.

  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Acties

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

Deze sectie groepeert de knoppen voor het beheren van de winkelwagen, opslaan of afronden van een verkoop:

- **Tickets**: Biedt toegang tot de lopende verkooptickets.
- **Betalen**: Leidt door naar de /checkout-pagina om de verkoop af te ronden van de artikelen in de winkelwagen en registreert de transactie.

  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)

- **Opslaan**: Slaat de huidige status van de winkelwagen of parameterwijzigingen op.
- **Pool**: Kan worden gebruikt om de bestelling te verdelen, groepen artikelen te beheren of klanten aan een specifieke bestelling te koppelen.
- **Lade openen**: Opent de kassalade voor toegang tot contant geld (vereist een aangesloten fysiek systeem).
- **Prullenbak**: Maakt het mogelijk de inhoud van de winkelwagen te legen.

  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)

- **Verwijderen**: Maakt het mogelijk de laatste regel van de winkelwagen te verwijderen.

  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Thema

Standaard gebruikt POS Touch Screen het ontwerp dat op de voorgaande schermafbeeldingen wordt gepresenteerd, maar het is mogelijk om dit ontwerp te wijzigen door het thema aan te passen in **Admin** > **Merch** > **Themes**.

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
