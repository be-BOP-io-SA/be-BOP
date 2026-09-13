# Documentazione dell'interfaccia di Reporting

Questa pagina permette di consultare ed esportare i dettagli su ordini, prodotti e pagamenti. È accessibile tramite la scheda **Admin** > **Config** > **Reporting**.

![image](https://github.com/user-attachments/assets/0de30f78-fb01-40e9-96f2-08e6b1af5666)

Visualizza il reporting del mese e dell'anno in corso.

---

## Funzionalità

### 1. Filtri di Reporting

![image](https://github.com/user-attachments/assets/a5180e63-7161-4679-b9c3-fc1c55b081c3)

- **Opzioni di filtro**: Permette di filtrare gli ordini in base al loro stato:
  - `Include pending orders`: Includere gli ordini in attesa.
  - `Include expired orders`: Includere gli ordini scaduti.
  - `Include canceled orders`: Includere gli ordini annullati.
  - `Include partially paid orders`: Includere gli ordini parzialmente pagati.
- **Utilizzo**: Seleziona le caselle corrispondenti per includere questi tipi di ordini nel reporting.
  Per impostazione predefinita, vengono elencati solo gli ordini pagati.

### 2. Order Detail (Dettaglio Ordine)

![image](https://github.com/user-attachments/assets/5bf4e3ea-e4d9-4af6-91ba-035263d43305)

- **Export CSV**: Permette di esportare i dettagli degli ordini in formato CSV.
- **Tabella dei Dettagli Ordine**:
  - Visualizza le informazioni relative agli ordini. Ogni riga rappresenta un ordine.
  - `Order ID`: Identificativo univoco dell'ordine (clicca per vedere maggiori dettagli).
  - `Order URL`: Link diretto all'ordine.
  - `Order Date`: Data dell'ordine.
  - `Order Status`: Stato dell'ordine (es.: paid, pending).
  - `Currency`: Valuta della transazione.
  - `Amount`: Importo totale dell'ordine.
  - `Billing Country`: Paese di fatturazione (se disponibile).
  - `Billing Info`: Informazioni per l'indirizzo di fatturazione.
  - `Shipping Country`: Paese di spedizione (se disponibile).
  - `Shipping Info`: Informazioni per l'indirizzo di spedizione.
  - `Cart`: gli articoli nel carrello dell'ordine

### 3. Product Detail (Dettaglio Prodotto)

![image](https://github.com/user-attachments/assets/810f57f1-1d28-4a35-8f86-ca7a4e46ab77)

- **Export CSV**: Permette di esportare le informazioni dei prodotti associati agli ordini in formato CSV.
- **Tabella dei Dettagli Prodotto**:
  - Visualizza le informazioni relative ai prodotti associati agli ordini. Ogni riga corrisponde a un prodotto aggiunto per un ordine specifico.
  - `Product URL`: Link diretto al prodotto.
  - `Product Name`: Nome del prodotto.
  - `Quantity`: Quantità ordinata.
  - `Deposit`: Importo dell'acconto per il prodotto (se applicabile).
  - `Order ID`: Riferimento dell'ordine associato.
  - `Order Date`: Data dell'ordine associato.
  - `Currency`: Valuta della transazione.
  - `Amount`: Importo totale per questo prodotto.
  - `Vat Rate`: Aliquota IVA applicata.

### 4. Payment Detail (Dettaglio Pagamento)

![image](https://github.com/user-attachments/assets/f653e4e8-9bd9-416b-b944-5f0774be7847)

- **Export CSV**: Permette di esportare i dettagli di pagamento in formato CSV.
- **Tabella dei Dettagli di Pagamento**:
  - Visualizza le informazioni relative ai pagamenti associati agli ordini. Ogni riga corrisponde a un pagamento effettuato per un ordine specifico.
  - `Order ID`: Riferimento dell'ordine associato.
  - `Invoice ID`: Riferimento della fattura.
  - `Payment Date`: Data del pagamento.
  - `Order Status`: Stato dell'ordine.
  - `Payment mean`: Metodo di pagamento
  - `Payment Status`: Stato del pagamento.
  - `Payment Info`: Informazioni del pagamento.
  - `Order Status`: Stato dell'ordine.
  - `Invoice`: Numero della fattura.
  - `Currency`: Valuta utilizzata dal negozio.
  - `Amount`: Importo del pagamento convertito con la valuta.
  - `Cashed Currency`: Valuta di pagamento.
  - `Cashed Amount`: Importo del pagamento convertito con la valuta di pagamento.
  - `Billing Country`: Paese di fatturazione

### 5. Filtro del reporting

![image](https://github.com/user-attachments/assets/bd5a7a8c-7576-48b8-bb48-8c83440cc1a4)

Utilizzato per filtrare il reporting per mese e anno scelti.

### 6. Order synthesis (Sintesi degli ordini)

![image](https://github.com/user-attachments/assets/f69c3d05-9baa-422a-8efd-6d0873d9f3b3)

- **Export CSV**: Permette di esportare la sintesi degli ordini in formato CSV.
- **Tabella dei Dettagli di Pagamento**:
  - Visualizza un riepilogo delle statistiche degli ordini per un periodo determinato.
  - `Period`: Indica il mese e l'anno del periodo interessato.
  - `Order Quantity`: Numero totale di ordini effettuati durante questo periodo.
  - `Order Total`: Importo cumulato di tutti gli ordini per il periodo indicato.
  - `Average Cart`: Importo medio degli ordini per questo periodo.
  - `Currency`: Valuta nella quale gli ordini sono stati effettuati (ad esempio, BTC per Bitcoin).

### 7. Product synthesis (Sintesi dei prodotti)

![image](https://github.com/user-attachments/assets/1178d887-fe2a-46b6-8bf4-2baf9abf9dd1)

- **Export CSV**: Permette di esportare la sintesi dei prodotti in formato CSV.
- **Tabella dei Dettagli di Pagamento**:
  - Visualizza un riepilogo delle statistiche dei prodotti per un periodo determinato.
  - `Period`: Indica il mese e l'anno del periodo interessato.
  - `Product ID`: ID del prodotto.
  - `Product Name`: Nome del prodotto.
  - `Order Quantity`: Quantità ordinata.
  - `Currency`: Valuta nella quale gli ordini sono stati effettuati (ad esempio, BTC per Bitcoin).
  - `Total Price`: Totale dell'ordine (ad esempio, BTC per Bitcoin).

### 8. Payment synthesis (Sintesi dei pagamenti)

![image](https://github.com/user-attachments/assets/dd23107e-9abe-4eff-83ac-f0c9685f62a9)

- **Export CSV**: Permette di esportare la sintesi dei pagamenti in formato CSV.
- **Tabella dei Dettagli di Pagamento**:
  - Visualizza un riepilogo delle statistiche dei pagamenti per un periodo determinato.
  - `Period`: Indica il mese e l'anno del periodo interessato.
  - `Payment Mean`: Il metodo di pagamento utilizzato.
  - `Payment Quantity`: La quantità pagata.
  - `Total Price`: Il prezzo totale pagato.
  - `Currency`: Valuta nella quale gli ordini sono stati effettuati (ad esempio, BTC per Bitcoin).
  - `Currency`: Valuta nella quale gli ordini sono stati effettuati (ad esempio, BTC per Bitcoin).
  - `Average`: Importo medio pagato.

---

## Esportazione dei Dati

Ogni sezione (Order Detail, Product Detail, Payment Detail) dispone di un pulsante `Export CSV` che permette di scaricare i dati visualizzati sotto forma di file CSV.

Un esempio:

![image](https://github.com/user-attachments/assets/bb60b964-f815-461d-adc3-ca940b48a1c6)
