# Documentatie Contactformulier Widget

Toegankelijk via **Admin** > **Widgets** > **Form**, de form-widgets kunnen in uw be-BOP worden gebruikt om contactformulieren te integreren in CMS-zones of -pagina's.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Een contactformulier toevoegen

Om een contactformulier toe te voegen, klikt u op **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Basisinformatie

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: De naam van het contactformulier.
- **Slug**: Unieke identificatie van het contactformulier.

### Informatie van het contactformulier

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Stelt de winkeleigenaar in staat om een doel-e-mailadres of npub op te geven voor contactmeldingen; als dit niet is ingevuld, wordt standaard het contact-e-mailadres van de identiteit gebruikt.
- **Display from: field**: Wanneer aangevinkt, wordt het afzenderveld (From:) weergegeven op het contactformulier. Het gaat vergezeld van een selectievakje **Prefill with session information** dat, wanneer aangevinkt, het from-veld vooraf invult met sessie-informatie.
- **Add a warning to the form with mandatory agreement**: Voegt een verplicht selectievakje toe om een instemmingsbericht weer te geven voordat het contactformulier wordt verzonden.
  - **Disclaimer label**: een titel voor het instemmingsbericht.
  - **Disclaimer Content**: de tekst van het instemmingsbericht.
  - **Disclaimer checkbox label**: de tekst van het selectievakje voor het instemmingsbericht.
- **Subject**: Het onderwerp van het contactformulier.
- **Content**: De inhoud van het contactformulier.

Voor onderwerpen en inhoud kunnen de volgende tags in de tekst worden gebruikt:

`{{productLink}}` en `{{productName}}` wanneer ze op een productpagina worden gebruikt.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` en `{{pageName}}` wanneer ze elders worden gebruikt.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## CMS-integratie

Om uw contactformulier te integreren in een CMS-zone of -pagina kunt u het als volgt toevoegen: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

En uw contactformulier wordt als volgt weergegeven voor uw gebruikers.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
