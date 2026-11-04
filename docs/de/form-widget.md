# Kontaktformular-Widget-Dokumentation

Zugänglich über **Admin** > **Widgets** > **Form**, Formular-Widgets können in Ihrem be-BOP verwendet werden, um Kontaktformulare in CMS-Zonen oder -Seiten zu integrieren.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Ein Kontaktformular hinzufügen

Um ein Kontaktformular hinzuzufügen, klicken Sie auf **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Grundinformationen

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: Der Name des Kontaktformulars.
- **Slug**: Eindeutiger Bezeichner für das Kontaktformular.

### Kontaktformular-Informationen

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Ermöglicht dem Shop-Besitzer, eine Ziel-E-Mail-Adresse oder npub für Kontaktbenachrichtigungen festzulegen; wenn nicht ausgefüllt, wird der Standardwert die Kontakt-E-Mail der Identität sein.
- **Display from: field**: Wenn aktiviert, wird das Absender-Feld (From:) im Kontaktformular angezeigt. Es wird von einem Kontrollkästchen **Prefill with session information** begleitet, das bei Aktivierung das Absender-Feld mit Sitzungsinformationen vorbefüllt.
- **Add a warning to the form with mandatory agreement**: Fügt ein Pflicht-Kontrollkästchen hinzu, um eine Zustimmungsnachricht vor dem Absenden des Kontaktformulars anzuzeigen.
  - **Disclaimer label**: Ein Titel für die Zustimmungsnachricht.
  - **Disclaimer Content**: Der Text der Zustimmungsnachricht.
  - **Disclaimer checkbox label**: Der Text für das Kontrollkästchen der Zustimmungsnachricht.
- **Subject**: Der Betreff des Kontaktformulars.
- **Content**: Der Inhalt des Kontaktformulars.

Für Betreff und Inhalt können Sie die folgenden Tags im Text verwenden:

`{{productLink}}` und `{{productName}}` bei Verwendung auf einer Produktseite.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` und `{{pageName}}` bei Verwendung an anderer Stelle.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## CMS-Integration

Um Ihr Kontaktformular in eine CMS-Zone oder -Seite zu integrieren, fügen Sie es wie folgt hinzu: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

Und Ihr Kontaktformular wird Ihren Benutzern wie folgt angezeigt.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
