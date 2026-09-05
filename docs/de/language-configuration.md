Sprachkonfiguration

Der Bereich **Admin** > **Config** > **Languages** ermöglicht es Ihnen, die verfügbaren Sprachen in Ihrer Anwendung zu definieren und die Standardsprache zu konfigurieren.

## Funktionen

### Verfügbare Sprachen

- **Sprachliste**: Aktivieren Sie die Kontrollkästchen der Sprachen, die Sie in Ihrer be-BOP-Anwendung verfügbar machen möchten. Sie müssen mindestens eine Sprache auswählen.

  - Beispiel: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Standardsprache

- **Standardsprache**: Wählen Sie eine Sprache, die verwendet wird, wenn die bevorzugte Übersetzung des Benutzers nicht unter den Optionen verfügbar ist.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Verwaltung der Sprachauswahl

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Sprachauswahl ein- oder ausblenden**: Klicken Sie auf den Link **here**, um die Sichtbarkeit der Sprachauswahl in der Benutzeroberfläche zu verwalten.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Benutzerdefinierte Übersetzungsschlüssel

Der Bereich **Custom Translation Keys** ermöglicht es Ihnen, Übersetzungen für verschiedene Sprachen in Ihrer Anwendung anzupassen.

## Funktionen

### Übersicht

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- Sie können **spezifische Übersetzungsschlüssel** für jede verfügbare Sprache definieren.
- Übersetzungsschlüssel werden im JSON-Format definiert. Dies ermöglicht eine einfache und strukturierte Verwaltung Ihrer Übersetzungen.

### Übersetzungen bearbeiten

1. **Sprache auswählen**:
   - Jede Sprache wird in einem separaten Abschnitt dargestellt (z.B. `en` für Englisch, `es-sv` für El Salvador Spanisch).
2. **Übersetzungen hinzufügen**:
   - Fügen Sie Schlüssel und deren Werte im JSON-Textfeld hinzu oder ändern Sie sie.
   - Beispiel `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Speichern

- Sobald Übersetzungen hinzugefügt oder geändert wurden, werden die Änderungen nach Validierung und Speicherung automatisch angewendet.
