# Inizializzare il tuo be-BOP

Breve riepilogo prima di una documentazione più completa

Una volta che il tuo be-BOP è attivo (non dimenticare il readme.md):

## Account super-admin

- Vai su tuo-sito/admin/login
- crea il tuo account superadmin e la password

## /admin/config (tramite Admin / Config)

### Proteggere l'accesso al back-office

Vai su /admin/config, vai su "Admin hash", definisci un hash e salva.
Ora, l'indirizzo del back-office è /admin-tuohash

### Mettere il tuo be-BOP in modalità manutenzione

Vai su /admin/config, seleziona "Enable maintenance mode".
Puoi aggiungere qualsiasi IPv4 separato da virgole per consentire l'accesso al front-office.
Il back-office sarà sempre aperto.

### Definire le tue valute
Vai su /admin/config:
- la valuta principale viene utilizzata per la visualizzazione sul front-end e sulle fatture
- la seconda valuta è opzionale e viene utilizzata per la visualizzazione sul front-end
- la valuta di riferimento dei prezzi è la valuta predefinita con cui creerai i tuoi prezzi, ma potrai cambiarla prodotto per prodotto
  - cliccando il pulsante rosso e confermando, le valute dei tuoi prodotti verranno sovrascritte con la selezione scelta, ma il prezzo non verrà aggiornato
- la valuta contabile consente ai be-BOP interamente in BTC di salvare il tasso di cambio di Bitcoin al momento dell'ordine.

### Temporizzazione

La durata dell'abbonamento viene utilizzata per i prodotti in abbonamento, puoi scegliere mese, settimana o giorno.
Il promemoria di abbonamento è il ritardo tra l'invio della nuova proposta di fattura e la scadenza dell'abbonamento.

### Blocchi di conferma

Per i pagamenti Bitcoin on-chain, puoi definire un numero standard di verifiche per la transazione.
Ma con "Manage confirmation thresholds", potrai farlo in base al prezzo, ad esempio:
- < 100€: 0 conferme
- 100€ a 1000€: 1 conferma
- 1000€ a 9999999999999€: 2 conferme
ecc.

### Scadenza dell'ordine

"Set desired timeout for payment (in minute)" permette di annullare un ordine sul sistema be-BOP se la transazione non è stata pagata o verificata a sufficienza.
Funziona solo per Bitcoin on-chain, Lightning e carta di credito tramite Sum Up.
Un tempo troppo breve ti obbligherà ad avere un obiettivo di blocchi di conferma on-chain breve / nullo.
Un tempo troppo lungo bloccherà il tuo stock di prodotti mentre l'ordine è in sospeso.

### Prenotazione dello stock
Per evitare l'accaparramento dello stock, puoi impostare "How much time a cart reserves the stock (in minutes)".
Quando aggiungo un prodotto al carrello, se è l'ultimo, nessun altro potrà farlo.
Ma se non completo l'ordine e attendo più del tempo definito, il prodotto sarà nuovamente disponibile e verrà rimosso dal mio carrello se qualcun altro lo acquista.

### TBD

## /admin/identity (tramite Config / Identity)

Qui, tutte le informazioni sulla tua azienda verranno utilizzate per fatture e ricevute.

"Invoice Information" è opzionale e verrà aggiunta in alto a destra della ricevuta.

Per abilitare il metodo di pagamento "bonifico bancario", devi compilare IBAN e BIC del tuo "Bank account".

L'email delle informazioni di contatto verrà utilizzata come mittente per le email e visualizzata nel footer.

## /admin/nostr (tramite Node management / Nostr)

Vai su /admin/nostr (tramite Node management / Nostr) poi clicca su "Create nsec" se non ne hai già uno.
Poi, puoi aggiungerlo nel file .env.local (vedi readme.md)

## /admin/sumup (tramite Payment partner / Sum Up)

Una volta che hai il tuo account Sum Up, usa la loro interfaccia per sviluppatori e copia la chiave API qui.
Il codice commerciante si trova nella tua dashboard, o nelle ricevute delle transazioni precedenti.
La valuta è la valuta del tuo account Sum Up (in genere, del paese in cui ha sede la tua azienda).

# Il resto

Per ora, e per le cose al di fuori del back-office, non dimenticare il readme.md.

Il documento di governance verrà pubblicato presto, ma, in breve, ogni pull request verrà revisionata da:
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
E se siamo d'accordo, faremo il merge.

Rifiuteremo esigenze ultra-specifiche e opteremo per funzionalità generiche che possano essere utilizzate dal maggior numero di persone.
