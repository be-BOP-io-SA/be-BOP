# Documentatie Tag Widget

Toegankelijk via **Admin** > **Widgets** > **Tag**, tags zijn:

- Een manier om makers/merken/categorieen te beheren zonder een zwaar categorie-/merken-/fabrikantbeheersysteem.
- Een manier om webpagina's van be-BOP op te fleuren en diepte te geven met zowel statische als dynamische inhoud op CMS-pagina's.
- Een manier om partners en verkopers een middel te geven om een mooie, goed gevulde catalogus te hebben, vol met context rond de producten, waarbij pseudo-dynamische categorieen niet slechts een lijst van producten zijn.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Tag Family

Tags zijn ingedeeld in 4 families voor eenvoudige organisatie.

- Creators: voor maker-tags
- Retailers: voor tags die aan een winkel zijn gekoppeld
- Temporal: voor tijdsgebonden tags
- Events: voor evenement-tags

## Speciale tags

Er bestaat een speciale tag `pos-favorite`, zie [pos-touch-screen.md].

## Een tag toevoegen

Om een tag toe te voegen, klikt u op **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

De interface **"Add a tag"** stelt gebruikers in staat een nieuwe tag toe te voegen met specifieke informatie, zoals de naam, slug, familie, titel, ondertitel...

### Formuliervelden

- **Tag name**: de naam die de tag identificeert
- **Slug**: Unieke identificatie die wordt gebruikt in de URL, voor CMS-integratie... Automatisch gegenereerd vanuit de naam.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Opties**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only**: Alleen voor CMS-integratie, kan niet als categorie worden gebruikt.
  [ ] **Available for product tagging**: Beschikbaar om producten te categoriseren.
  [ ] **Use light/dark inverted mode**: Gebruik de omgekeerde licht/donker modus.

- **Tag Family**: de familie van de tag

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Titel die wordt weergegeven op de tag bij CMS-integratie
- **Tag subtitle**: De ondertitel die wordt weergegeven op de tag bij CMS-integratie
- **Short content**: De korte inhoud die wordt weergegeven afhankelijk van de variatie.
- **Full content**: De lange inhoud die wordt weergegeven afhankelijk van de variatie.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: Een lijst met foto's om te uploaden. Elke foto is gekoppeld aan een variatie.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Knoppen gekoppeld aan links die worden weergegeven bij het tonen van de tag in een CMS-zone of -pagina.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text** (Tekst): Beschrijving van de knop die aan de tag is gekoppeld.
    _Voorbeeld: "Meer bekijken"_
  - **URL**: URL-link die verwijst naar een pagina of aanvullende inhoud bij het klikken op de knop.
  - **Open in new tab** (Openen in nieuw tabblad): Optie om de link in een nieuw browsertabblad te openen.

- **CSS Override**: om de bestaande CSS van de tag te overschrijven.

## CMS-integratie

Om een tag te integreren in een CMS-zone of -pagina kunt u deze als volgt toevoegen: `[Tag=slug?display=var-1]`.
De `var` definieren de mogelijke weergavevariaties en gaan van `var-1` tot `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

En uw tag wordt als volgt weergegeven voor uw gebruikers.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
