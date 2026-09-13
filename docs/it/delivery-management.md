# Gestione dei costi di spedizione

## Introduzione
be-BOP offre attualmente un solo metodo di spedizione generico.
Tuttavia, esistono diversi modi per gestire i costi di spedizione.
I costi di spedizione possono essere configurati:
- globalmente su /admin/config/delivery
- in dettaglio su /admin/product/{id}

## Modalità di gestione
Le due principali sono:
- Tariffa fissa: ogni ordine viene addebitato di un certo importo (definito in /admin/config/delivery), in una valuta definita.
  - "Apply flat fee for each item instead of once for the whole order": in questa modalità, la tariffa fissa viene applicata a ogni riga di articolo anziché al carrello.
- "Fees depending on product": ogni prodotto ha i propri costi di spedizione specifici, che vengono aggiunti al carrello in base al numero di articoli ordinati.
  - in questa modalità, viene applicata solo la tariffa di spedizione dell'articolo più costoso, anziché la somma totale.

In tutti i casi, questi calcoli riguardano solo i prodotti per i quali è stata attivata l'opzione "The product has a physical component that will be shipped to the customer's address" in /admin/product/{id}.
I costi di spedizione e i contributi forfettari alla spedizione non vengono presi in considerazione nel calcolo dei tipi di prodotto.

### Riga di articolo?
[Screenshot requis]
Un carrello del cliente contiene generalmente diverse righe, ognuna corrispondente a un prodotto A in quantità n.
Quindi, se ho il seguente carrello:
- Articolo A qtà 2
- Articolo B qtà 3
- Articolo C qtà 4
- Articolo D qtà 8
Il mio carrello contiene 4 righe di articoli.

Nel caso di una configurazione con tariffa fissa di 10€, il costo di spedizione sarà 10€.
Per una configurazione "Tariffa fissa" di 10€ con l'opzione "Apply flat fee for each item instead of once for the whole order", il costo di spedizione sarà 4 righe di articoli * 10€, ovvero 40€.

### Articolo indipendente
A volte, un articolo ingombrante o fragile da solo giustifica una spedizione separata, un'assicurazione, un imballaggio speciale, una protezione per la spedizione, ecc.
Quando aggiungi lo stesso articolo A al carrello 2 volte, il carrello visualizza una singola riga con "Articolo A qtà 2".
Se abiliti l'opzione "This is a standalone product" in /admin/product/{id}, ogni volta che aggiungi un prodotto, lo aggiungerai su una riga singola.
Quindi, se ho un articolo B (ad esempio un televisore) e lo aggiungo 3 volte, il mio carrello diventa:
- Articolo A qtà 2
- Articolo B
- Articolo B
- Articolo B
Il mio carrello ora contiene 4 righe di articoli: 1 articolo indipendente corrisponde a 1 riga del carrello.

## Zone di spedizione
Per impostazione predefinita, le zone di spedizione e i relativi costi non sono definiti.
Per definire un costo di spedizione globale, seleziona "Other countries", aggiungilo e imposta un costo.
Se definiamo un prezzo di spedizione per il paese A, un altro per il paese B e uno finale per "Other Countries", il prezzo impostato per "Other Countries" verrà utilizzato per impostazione predefinita per tutti i paesi che non sono né il paese A né il paese B.

## Prezzi di spedizione specifici per prodotto e restrizioni di spedizione per prodotto
(TBD)
