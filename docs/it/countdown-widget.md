# Documentazione conto alla rovescia

Disponibile su **Admin** > **Widgets** > **Countdowns**, questa interfaccia permette di configurare un conto alla rovescia che può essere utilizzato per mettere in evidenza una scadenza importante, come un'offerta promozionale o un evento speciale.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Aggiungere un conto alla rovescia

Per aggiungere un conto alla rovescia cliccate su **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Descrizione**: Identificativo interno univoco per il conto alla rovescia.

### 2. **Slug**

- **Descrizione**: URL o chiave di identificazione univoca per il conto alla rovescia.
- **Vincoli**:
  - Può contenere solo lettere minuscole, numeri, trattini.
  - Utile per generare link specifici.

### 3. **Title**

- **Descrizione**: Titolo visibile associato al conto alla rovescia.
- **Utilizzo**: Questo testo può essere visualizzato sul sito per contestualizzare il conto alla rovescia.

### 4. **Description**

- **Descrizione**: Testo facoltativo che descrive i dettagli del conto alla rovescia.
- **Utilizzo**: Ideale per aggiungere contesto o istruzioni relative all'evento.

### 5. **End At**

- **Descrizione**: Data e ora di fine del conto alla rovescia.
- **Dettagli**:
  - Il fuso orario è basato su quello del browser dell'utente (visualizzato in **GMT+0**).
  - Utilizzate il calendario integrato per selezionare data e ora in modo intuitivo.

## Integrazione CMS

Per integrare il vostro conto alla rovescia in una zona o pagina CMS potete aggiungerlo come segue: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

E il vostro conto alla rovescia sarà visualizzato per i vostri utenti come segue.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
