# Countdown-Dokumentation

Verfügbar über **Admin** > **Widgets** > **Countdowns**, diese Oberfläche ermöglicht es Ihnen, einen Countdown zu konfigurieren, der verwendet werden kann, um eine wichtige Frist hervorzuheben, wie z.B. ein Werbeangebot oder ein besonderes Ereignis.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Einen Countdown hinzufügen

Um einen Countdown hinzuzufügen, klicken Sie auf **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Beschreibung**: Eindeutiger interner Bezeichner für den Countdown.

### 2. **Slug**

- **Beschreibung**: URL oder eindeutiger Identifikationsschlüssel für den Countdown.
- **Einschränkungen**:
  - Darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.
  - Nützlich für die Generierung spezifischer Links.

### 3. **Title**

- **Beschreibung**: Sichtbarer Titel des Countdowns.
- **Verwendung**: Dieser Text kann auf der Website angezeigt werden, um den Countdown zu kontextualisieren.

### 4. **Description**

- **Beschreibung**: Optionaler Text zur Beschreibung der Countdown-Details.
- **Verwendung**: Ideal zum Hinzufügen von Kontext oder Anweisungen zum Ereignis.

### 5. **End At**

- **Beschreibung**: Enddatum und -uhrzeit des Countdowns.
- **Details**:
  - Die Zeitzone basiert auf dem Browser des Benutzers (angezeigt in **GMT+0**).
  - Verwenden Sie den integrierten Kalender, um Datum und Uhrzeit intuitiv auszuwählen.

## CMS-Integration

Um Ihren Countdown in eine CMS-Zone oder -Seite zu integrieren, fügen Sie ihn wie folgt hinzu: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

Und Ihr Countdown wird Ihren Benutzern wie folgt angezeigt.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
