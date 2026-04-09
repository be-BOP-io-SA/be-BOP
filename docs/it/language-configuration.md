Configurazione delle lingue

La sezione **Admin** > **Config** > **Languages** vi permette di definire le lingue disponibili nella vostra applicazione e di configurare la lingua predefinita.

## Funzionalità

### Lingue disponibili

- **Lista delle lingue**: Selezionate le caselle delle lingue che desiderate rendere disponibili nella vostra applicazione be-BOP. Dovete selezionare almeno una lingua.

  - Esempio: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Lingua predefinita

- **Lingua predefinita**: Selezionate una lingua che verrà utilizzata se la traduzione preferita dall'utente non è disponibile tra le opzioni.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Gestione del selettore di lingua

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Visualizzare o nascondere il selettore di lingua**: Cliccate sul link **here** per gestire la visibilità del selettore di lingua nell'interfaccia utente.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Chiavi di Traduzione Personalizzate

La sezione **Custom Translation Keys** permette di personalizzare le traduzioni per le diverse lingue nella vostra applicazione.

## Funzionalità

### Panoramica

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- Potete definire **chiavi di traduzione specifiche** per ogni lingua disponibile.
- Le chiavi di traduzione sono definite in formato JSON. Questo permette una gestione semplice e strutturata delle vostre traduzioni.

### Modifica delle traduzioni

1. **Selezionate una lingua**:
   - Ogni lingua è rappresentata in una sezione distinta (ad esempio, `en` per inglese, `es-sv` per spagnolo di El Salvador).
2. **Aggiungete le vostre traduzioni**:
   - Aggiungete o modificate chiavi e i loro valori nel campo di testo JSON.
   - Esempio `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Salvataggio

- Una volta aggiunte o modificate le traduzioni, le modifiche vengono automaticamente applicate dopo la validazione e il salvataggio.
