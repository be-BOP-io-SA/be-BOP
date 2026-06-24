# Documentazione Widget Modulo di Contatto

Accessibile su **Admin** > **Widgets** > **Form**, i widget form possono essere utilizzati nel vostro be-BOP per integrare moduli di contatto in zone o pagine CMS.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Aggiungere un modulo di contatto

Per aggiungere un modulo di contatto cliccate su **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Informazioni di base

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: Il nome del modulo di contatto.
- **Slug**: Identificativo univoco del modulo di contatto.

### Informazioni del modulo di contatto

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Permette al proprietario del negozio di definire un indirizzo email di destinazione o un npub per le notifiche di contatto; se non compilato, il valore predefinito sarà l'email di contatto dell'identità
- **Display from: field**: Quando selezionato, visualizza il campo mittente (From:) sul modulo di contatto. È accompagnato da una casella **Prefill with session information** che quando selezionata precompila il campo from con le informazioni di sessione.
- **Add a warning to the form with mandatory agreement**: Aggiunge una casella obbligatoria per visualizzare un messaggio di accordo prima dell'invio del modulo di contatto.
  - **Disclaimer label**: un titolo per il messaggio di accordo.
  - **Disclaimer Content**: il testo del messaggio di accordo.
  - **Disclaimer checkbox label**: il testo del campo da selezionare per il messaggio di accordo.
- **Subject**: L'oggetto del modulo di contatto.
- **Content**: Il contenuto del modulo di contatto.

Per i campi subject e content si possono utilizzare i seguenti tag nel testo:

`{{productLink}}` e `{{productName}}` quando utilizzati su una pagina prodotto.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` e `{{pageName}}` quando utilizzati ovunque.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## Integrazione CMS

Per integrare il vostro modulo di contatto in una zona o pagina CMS potete aggiungerlo come segue: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

E il vostro modulo di contatto sarà visualizzato per i vostri utenti come segue.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
