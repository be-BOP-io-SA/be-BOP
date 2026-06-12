# Tag-Widget-Dokumentation

Zugänglich über **Admin** > **Widgets** > **Tag**, Tags sind:

- Eine Möglichkeit, Ersteller/Marken/Kategorien ohne ein schwerfälliges Kategorie-/Marken-/Herstellerverwaltungssystem zu verwalten.
- Eine Möglichkeit, be-BOP-Webseiten mit statischen und dynamischen Inhalten auf CMS-Seiten aufzuwerten und zu vertiefen.
- Eine Möglichkeit, Partnern und Verkäufern einen schönen, gut gefüllten Katalog zu bieten, gefüllt mit Kontext rund um Produkte, wobei die pseudo-dynamischen Kategorien nicht nur eine Liste von Produkten sind.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Tag-Familie

Tags werden in 4 Familien zur besseren Organisation klassifiziert.

- Creators: für Ersteller-Tags
- Retailers: für Tags im Zusammenhang mit einem Geschäft
- Temporal: für zeitliche Tags
- Events: für Veranstaltungs-Tags

## Spezielle Tags

Es gibt ein spezielles Tag `pos-favorite`, siehe [pos-touch-screen.md].

## Ein Tag hinzufügen

Um ein Tag hinzuzufügen, klicken Sie auf **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

Die Oberfläche **"Add a tag"** ermöglicht es Benutzern, ein neues Tag mit spezifischen Informationen hinzuzufügen, wie Name, Slug, Familie, Titel, Untertitel...

### Formularfelder

- **Tag name**: Der Name, der das Tag identifiziert.
- **Slug**: Eindeutiger Bezeichner, der in der URL verwendet wird, für CMS-Integration... Automatisch aus dem Namen generiert.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Optionen**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only**: Nur für CMS-Integration, kann nicht als Kategorie verwendet werden.
  [ ] **Available for product tagging**: Verfügbar für die Kategorisierung von Produkten.
  [ ] **Use light/dark inverted mode**: Den invertierten Hell/Dunkel-Modus verwenden.

- **Tag Family**: Die Tag-Familie.

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Titel, der auf dem Tag bei CMS-Integration angezeigt wird.
- **Tag subtitle**: Untertitel, der auf dem Tag bei CMS-Integration angezeigt wird.
- **Short content**: Kurzer Inhalt, der je nach Variante angezeigt wird.
- **Full content**: Langer Inhalt, der je nach Variante angezeigt wird.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: Eine Liste von Fotos zum Hochladen. Jedes Foto ist mit einer Variante verknüpft.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Schaltflächen, verknüpft mit Links, die bei der Anzeige des Tags in einer CMS-Zone oder -Seite erscheinen.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text**: Beschreibung der Schaltfläche des Tags.
    _Beispiel: "Mehr anzeigen"_
  - **URL**: URL-Link, der auf eine Seite oder zusätzliche Inhalte verweist, wenn die Schaltfläche geklickt wird.
  - **Open in new tab**: Option, den Link in einem neuen Browser-Tab zu öffnen.

- **CSS Override**: Zum Überschreiben des bestehenden CSS des Tags.

## CMS-Integration

Um ein Tag in eine CMS-Zone oder -Seite zu integrieren, fügen Sie es wie folgt hinzu: `[Tag=slug?display=var-1]`.
Die `var`-Werte definieren die möglichen Anzeigevarianten, von `var-1` bis `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

Und Ihr Tag wird Ihren Benutzern wie folgt angezeigt.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
