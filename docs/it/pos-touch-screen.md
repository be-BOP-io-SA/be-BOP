# Documentazione dell'Interfaccia di Gestione Vendite

Questa documentazione descrive le funzionalità dell'interfaccia tattile (POS Touch Screen) di cassa per la selezione e la gestione degli articoli nel carrello.

---

## Panoramica Generale

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

L'interfaccia è divisa in diverse sezioni per facilitare la gestione delle vendite:

1. **Carrello**: Visualizza gli articoli selezionati dal cliente.
2. **Preferiti e Tag Articoli**: Permette di trovare rapidamente gli articoli.
3. **Tutti gli Articoli**: Visualizza tutti gli articoli disponibili.
4. **Azioni**: Pulsanti per gestire il carrello e finalizzare la vendita.

---

## Configurazione

Su admin/tag pos-favorite è un tag da creare per visualizzare per impostazione predefinita degli articoli come preferiti nell'interfaccia /pos/touch

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

Su admin/config/pos si possono aggiungere dei tag affinché servano come menu su /pos/touch

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Descrizione delle Sezioni

### 1. Carrello

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Visualizzazione**: Situato sul lato sinistro dell'interfaccia, questa sezione mostra gli articoli attualmente nel carrello.
- **Stato iniziale**: Visualizza "Il carrello è vuoto" quando nessun articolo è aggiunto.
- **Funzionalità**: Permette di visualizzare gli articoli aggiunti così come la loro quantità e prezzo totale.
- **Aggiunta al Carrello**: Per aggiungere al carrello su uno schermo punto vendita basta cliccare sull'articolo

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  e l'articolo sarà aggiunto al carrello e visualizzato nel blocco ticket

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  quando un articolo è aggiunto al carrello si può aggiungere una nota cliccando sul nome dell'articolo

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)

  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Preferiti e Tag Articoli

- **Preferiti**: La sezione `Preferiti` in cima all'interfaccia presenta una lista degli articoli contrassegnati come preferiti per un accesso rapido.

  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Gestione dei Preferiti**: Potete contrassegnare degli articoli come preferiti durante la loro creazione per facilitare il loro accesso successivo.

- **Tag Articoli**: La sezione sotto "Preferiti" presenta una lista degli articoli secondo diversi tag

  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. Tutti gli Articoli

- **Visualizzazione degli Articoli**: Presenta una lista di tutti gli articoli disponibili nel sistema, organizzati con immagini e nomi degli articoli.

  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Azioni

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

Questa sezione raggruppa i pulsanti per gestire il carrello, salvare o finalizzare una vendita:

- **Tickets**: Accede ai ticket di vendita in corso.
- **Paga**: Reindirizza verso la pagina /checkout per finalizzare la vendita degli articoli presenti nel carrello e registra la transazione.

  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)

- **Salva**: Salva lo stato attuale del carrello o le modifiche dei parametri.
- **Pool**: Può essere utilizzato per dividere l'ordine, gestire gruppi di articoli o associare clienti a un ordine specifico.
- **Apri Cassetto**: Apre il cassetto della cassa per accedere ai fondi (richiede un sistema fisico connesso).
- **🗑️**: Permette di svuotare il contenuto del carrello.

  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)

- **❎**: Permette di eliminare l'ultima riga del carrello.

  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Tema

Per impostazione predefinita POS Touch Screen utilizza il design presentato negli screenshot precedenti, ma è possibile cambiare questo design modificando il tema su **Admin** > **Merch** > **Themes**

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
