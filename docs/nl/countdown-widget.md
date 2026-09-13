# Documentatie afteltimer

Beschikbaar via **Admin** > **Widgets** > **Countdowns**, deze interface stelt u in staat om een afteltimer te configureren die kan worden gebruikt om een belangrijke deadline te benadrukken, zoals een promotionele aanbieding of een speciaal evenement.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Een afteltimer toevoegen

Om een afteltimer toe te voegen, klikt u op **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Beschrijving**: Unieke interne identificatie voor de afteltimer.

### 2. **Slug**

- **Beschrijving**: URL of unieke identificatiesleutel voor de afteltimer.
- **Beperkingen**:
  - Kan alleen kleine letters, cijfers en streepjes bevatten.
  - Nuttig voor het genereren van specifieke links.

### 3. **Title**

- **Beschrijving**: Zichtbare titel die aan de afteltimer is gekoppeld.
- **Gebruik**: Deze tekst kan op de site worden weergegeven om context te geven aan de afteltimer.

### 4. **Description**

- **Beschrijving**: Optionele tekst die de details van de afteltimer beschrijft.
- **Gebruik**: Ideaal voor het toevoegen van context of instructies over het evenement.

### 5. **End At**

- **Beschrijving**: Einddatum en -tijd van de afteltimer.
- **Details**:
  - De tijdzone is gebaseerd op die van de browser van de gebruiker (weergegeven in **GMT+0**).
  - Gebruik de ingebouwde kalender om de datum en tijd intuïtief te selecteren.

## CMS-integratie

Om uw afteltimer te integreren in een CMS-zone of -pagina kunt u deze als volgt toevoegen: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

En uw afteltimer wordt als volgt weergegeven voor uw gebruikers.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
