# Pagine CMS obbligatorie

## Introduzione

be-BOP utilizza nativamente alcune pagine obbligatorie per visualizzare vari testi (come le note legali), la homepage o le pagine di errore.
Queste pagine sono pagine CMS che possono essere personalizzate in /admin/CMS come qualsiasi altra pagina di contenuto ricco.

Gli slug per queste pagine sono:
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Homepage
Questa pagina viene visualizzata quando si accede alla radice del tuo sito (/).
Fungendo da vetrina per la tua azienda, dovrebbe (o può, a seconda dei gusti), in sintesi:
- presentare il tuo marchio
- presentare i tuoi valori
- presentare le tue novità
- mettere in evidenza certi articoli
- permettere di navigare il resto del tuo sito man mano, senza dover tornare ai menu
- presentare la tua identità grafica
- permettere alle persone di contattarti
- non essere sovraccaricata
Mentre ognuno di questi punti può essere sviluppato nella propria pagina CMS, una lettura verticale della tua homepage dovrebbe far venire voglia ai visitatori di scoprire il resto del tuo sito.

## /error - Pagina di errore
Se vuoi che venga visualizzata il meno possibile, è sempre meglio reindirizzare il tuo utente verso un contenuto piuttosto che un messaggio di errore grezzo.
Questo può assumere la forma di:
- un messaggio di scuse (essenziale)
- un modulo di contatto per segnalare l'anomalia riscontrata
- un link a una selezione di prodotti, una pagina di novità o la homepage

## /maintenance - Pagina di manutenzione
Vedi [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
Quando stai effettuando lavori sul tuo sito o hai bisogno di limitare l'accesso per migrazione, backup o altre operazioni, puoi mettere il tuo sito in manutenzione.
L'intero pubblico (modulo una lista di visitatori il cui IP è stato inserito nella whitelist), quando tenta di accedere a qualsiasi pagina del tuo sito, verrà reindirizzato alla pagina /maintenance.
Puoi includere:
- una spiegazione della chiusura del sito
- un'anteprima delle nuove funzionalità che arriveranno con la riapertura
- un modulo di contatto
- elementi visivi
- link ad altri siti o social network

## /terms - Condizioni d'uso
Questa pagina viene solitamente visualizzata nei link del footer del sito, ed è anche visualizzata nel tunnel di checkout con la casella di controllo obbligatoria **I agree to the terms of service**.
Il link a questa opzione obbligatoria nel tunnel (/checkout) porta a /terms, dando ai tuoi visitatori accesso a tutte le condizioni generali di vendita e utilizzo.
Compilare questa pagina è noioso, ma comunque obbligatorio!

## /privacy - Informativa sulla privacy
Vedi [privacy-management.md](/docs/en/privacy-management.md)
Questa pagina viene solitamente visualizzata nei link del footer del sito.
Permette ai tuoi visitatori di conoscere tutte le condizioni relative all'uso delle loro informazioni personali, conformità con il RGPD, raccolta dei cookie, ecc.
L'unico cookie presente (bootik-session) su be-BOP è il cookie di sessione, essenziale per il corretto funzionamento.
Non utilizziamo cookie pubblicitari.
Un secondo cookie (lang) è presente per memorizzare la tua scelta linguistica.
Come proprietario, puoi raccogliere più informazioni (informazioni di fatturazione, indirizzo IP) per motivi legali e contabili: si prega di spiegare in questa pagina.
Inoltre, sebbene gli optin per la prospezione commerciale siano nativamente disattivati su be-BOP, è possibile presentarli (disattivati) al cliente, e devi impegnarti a rispettare la scelta del cliente su ciò che sceglie o meno nei suoi optin.
Compilare questa pagina è noioso, ma comunque obbligatorio ed etico nei confronti dei tuoi visitatori!

## /why-vat-customs - Pagamento alla dogana alla ricezione
Vedi [VAT-configuration.md](/docs/en/VAT-configuration.md)
Sotto il regime IVA 2B (vendita all'aliquota IVA del paese del venditore ed esenzione per la consegna di articoli fisici all'estero), il cliente deve validare una nuova opzione obbligatoria: I understand that I will have to pay VAT upon delivery. Questa opzione si collega alla pagina CMS /why-vat-customs, che deve essere creata e completata per spiegare perché il tuo cliente deve pagare l'IVA nel proprio paese alla ricezione del tuo articolo.

## /why-collect-ip - Giustificazione per la raccolta dell'IP
Vedi [privacy-management.md](/docs/en/privacy-management.md)
Se, per motivi contabili o legali, hai bisogno di memorizzare l'indirizzo IP del tuo cliente per un acquisto dematerializzato senza indirizzo postale (tramite /admin/config con l'opzione **Request IP collection on deliveryless order**), al cliente verrà data un'opzione obbligatoria per completare l'ordine **I agree to the collection of my IP address (why?)**.
Il link per questa opzione porta a /why-collect-ip, dove è meglio spiegare perché vuoi salvare tali dati (ricordando che l'accettazione del cliente è obbligatoria per finalizzare l'ordine se configuri il tuo be-BOP in questo modo).

## /why-pay-reminder - Impegno a pagare un ordine in acconto
Vedi [order-with-deposit.md](/doc/en/order-with-deposit.md)
Quando attivi il pagamento in acconto per uno dei tuoi articoli, il primo ordine effettuato include solo l'acconto, ma il cliente si impegna a pagare al venditore il resto dell'importo dell'ordine alle condizioni presentate.
Se il tuo ordine include una prenotazione per un articolo in acconto, il link viene visualizzato nel tunnel di checkout con la casella di controllo obbligatoria **I agree that I need to pay the remainder in the future (why?)**.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom, /basket-top, /basket-bottom
Vedi [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
