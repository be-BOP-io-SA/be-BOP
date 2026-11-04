# Opzione Punto Vendita

## Introduzione

be-BOP ti permette di interagire con la tua community su Internet e può anche essere utilizzato come software per registratore di cassa (in uno stand o in un negozio).

POS: Point Of Sale (per il comportamento di cassa in negozio)

Utilizzando il ruolo POS e assegnandolo a un profilo [team-access-management.md](team-access-management.md), puoi dare a un profilo di cassa opzioni aggiuntive per modalità di acquisto specifiche.
L'utilizzo dell'account POS permette anche di avere un display lato cliente per mostrare:
- una pagina iniziale
- il carrello visualizzato in tempo reale
- il QR code di pagamento (Bitcoin, Lightning o CB Sum Up) una volta che l'ordine è stato validato
- una pagina di conferma una volta che il pagamento è stato confermato

## Gestione dell'account POS

Il ruolo di punto vendita è configurato per impostazione predefinita nel modulo /admin/arm:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Accesso all'account POS

Una volta assegnato a un profilo, la persona con accesso POS deve andare alla pagina di login dell'amministrazione (/admin/login, dove /admin è la stringa sicura configurata dal proprietario del be-BOP (vedi [back-office-access.md](back-office-access.md)) ed effettuare l'accesso.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(Nel caso di un negozio, è preferibile scegliere un tempo di mantenimento della connessione di "1 giorno", per evitare disconnessioni nel mezzo di una sessione di vendita).

## Utilizzo dell'account POS

Una volta connesso, l'utente POS accede all'URL /pos:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

La sessione /pos/session è collegata al display lato cliente (vedi dopo "Display cliente").
La visualizzazione delle ultime transazioni permette di fornire assistenza post-vendita in caso di richiesta da parte di un cliente.
Se l'account POS è stato configurato in questo modo nell'ARM, può accedere manualmente alle pagine /admin in un'altra scheda.

## Aggiunta al carrello

I prodotti accessibili all'account POS sono quelli configurati nel selettore di canale del prodotto ( [Retail (POS logged seat)](Retail (POS logged seat)) ):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

Le opzioni attivate nella colonna "Retail (POS logged seat)" si applicheranno esclusivamente all'account POS.

### Navigazione del catalogo

Il cassiere può aggiungere prodotti:
- tramite pagine CMS che visualizzano widget prodotto (vedi [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md))
- accedendo alla pagina /catalog che visualizza tutti gli articoli idonei tramite il selettore di canale

Il percorso verso il carrello è quindi simile a quello di qualsiasi altro utente sul web.

### Aggiunta rapida tramite Alias

Un alias può essere aggiunto a ogni prodotto ( [product-alias-management.md](product-alias-management.md) ).
Se gli articoli che vendi hanno un codice a barre (tipo ISBN / EAN13), questo può essere inserito come alias.

Nel carrello, l'account POS ha un'opzione non disponibile per l'utente medio: andando direttamente alla pagina del carrello (/cart), l'account POS ha un campo per inserire un alias (manualmente o tramite un lettore portatile USB).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

Dopo la conferma con "invio":__

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

Il campo "Alias" viene svuotato per permettere la scansione più rapida dell'articolo successivo.

In caso di errore nell'aggiunta al carrello, l'errore verrà notificato e il campo Alias verrà svuotato:
- Numero massimo di righe del carrello già raggiunto: "Cart has too many items".
- Alias inesistente: "Product not found".
- Stock esaurito: "Product is out of stock".
- Articolo "Abbonamento" aggiunto 2 volte: l'articolo non viene aggiunto una seconda volta (gli articoli in abbonamento hanno una quantità fissa di 1).
- Articolo con data di rilascio futura ma preordine non autorizzato: "Product is not available for pre-order".
- Articolo con aggiunta al carrello disabilitata nel selettore di canale: "Product can't be added to basket".
- Articolo con limite di quantità per ordine di acquisto già raggiunto:
  - Se non è un articolo "Stand alone": "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (al momento c'è un bug con questo controllo, l'articolo viene aggiunto e il messaggio viene visualizzato dopo l'aggiornamento del carrello, e la validazione del carrello torna a /cart con il messaggio di errore)
- Articolo non disponibile per la consegna nel tuo paese di destinazione: l'articolo viene aggiunto, ma il messaggio "Delivery is not available in your country for some items in your basket" viene visualizzato in fondo al carrello.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Nota che quando si aggiunge un articolo PWYW tramite alias, l'importo del prodotto sarà l'importo minimo configurato sul prodotto.

## Specificità del tunnel (/checkout)

L'account POS offre opzioni aggiuntive:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Spedizione

Il modulo dell'indirizzo è opzionale, purché sia selezionato un paese (a seconda del negozio), tutti gli altri campi sono opzionali (nel caso di un cliente che acquista, ritira direttamente in negozio e non richiede una fattura nominativa).
- Se il cliente richiede la consegna, il modulo dell'indirizzo può essere compilato.
- Se il cliente richiede una fattura, l'opzione "My delivery address and billing address are different" può essere utilizzata per compilare la fattura.

### Offrire la spedizione gratuita
Per impostazione predefinita, tutti gli ordini con articoli che hanno una controparte fisica sono considerati in consegna.
L'amministratore (o chiunque altro con accesso in scrittura a /admin/config) può abilitare questa opzione in /admin/config/delivery (vedi [delivery-management.md](delivery-management.md)).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

Se l'opzione "Allow voiding delivery fees on POS sale" è abilitata, questa opzione sarà disponibile nella pagina /checkout per l'account POS:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

Se l'opzione è attivata, deve essere compilata una giustificazione obbligatoria, per il follow-up gestionale:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

L'importo (costi di spedizione + IVA correlata) verrà detratto nella pagina successiva (i prezzi della pagina /checkout non vengono ancora aggiornati in tempo reale in base alle opzioni POS applicate).

### Pagamento multiplo o pagamento in negozio

L'account POS ti permette di utilizzare:
- i pagamenti classici offerti sul sito che sono stati attivati e sono idonei ( [payment-management.md](payment-management.md) ) per tutti i prodotti nel carrello
- il pagamento Punto Vendita, che include tutti i pagamenti al di fuori del sistema beBOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

Se "Use multiple payment methods" è attivato, la scelta del metodo di pagamento non è più necessaria (vedi "Dettagli ordine (/order)" sotto).

Quando si utilizza il pagamento convenzionale (CB Sum Up, Lightning o Bitcoin on-chain), il QR code di pagamento verrà visualizzato sul dispositivo del cliente (vedi "Display lato cliente" sotto).
Se viene utilizzato un bonifico bancario, l'ordine verrà sospeso e validato una volta che il trasferimento è stato ricevuto manualmente (non raccomandato per i pagamenti in negozio).

Se utilizzi il metodo di pagamento "Point of sale" (pagamento singolo), devi inserire il metodo di pagamento manualmente (vedi "Dettagli ordine (/order)" sotto).

### Esenzione IVA

Un account POS può scegliere di fatturare un cliente senza IVA (ad esempio, in Francia, un cliente aziendale).
⚖️ La tua legge locale deve autorizzare l'uso di questa opzione, della quale sei responsabile.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

Se l'opzione è attivata, deve essere compilata una giustificazione obbligatoria, per il follow-up gestionale:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

L'importo (IVA globale) verrà detratto nella pagina successiva (i prezzi della pagina /checkout non vengono ancora aggiornati in tempo reale in base alle opzioni POS applicate).

### Applicazione di uno sconto omaggio

Un account POS può scegliere di applicare uno sconto a un cliente:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

Se l'opzione è attivata, deve essere compilata una giustificazione obbligatoria, per il follow-up gestionale:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

Devi anche scegliere il tipo di riduzione:
- in percentuale (un messaggio di errore verrà visualizzato in caso di inserimento non valido, o riduzione del 100%)
- in importo corrispondente alla valuta principale del be-BOP (vedi [currency-management.md](currency-management.md)) (un messaggio di errore verrà visualizzato in caso di inserimento non valido, o di riduzione corrispondente al totale dell'ordine)

⚖️ La tua legge locale deve autorizzare l'uso di questa opzione e i suoi importi massimi, della quale sei responsabile (es. legge sul prezzo unico in Francia).

⚠️ In attesa che gli importi vengano aggiornati in tempo reale nella pagina /checkout, fai attenzione al cumulo di riduzione + esenzione IVA + annullamento dei costi di spedizione.
Sebbene non sia sconsigliato, la combinazione di funzioni richiede un minimo di attenzione.

### Contatto cliente opzionale

Normalmente, in modalità eshop, è necessario lasciare un indirizzo email o un npub Nostr per ricevere le notifiche dell'ordine e conservare l'URL di accesso.
In modalità POS, questi campi sono opzionali se un cliente rifiuta di lasciare i propri dati di contatto:
- In questo caso, però, informa i clienti che dovranno passare dal sistema di supporto del negozio per trovare l'URL del riepilogo dell'ordine, delle fatture e dei file scaricabili.
- Fornisci una stampante per stampare la fattura dopo l'acquisto.
- Se il carrello include un abbonamento, spiega che non si tratta di un rinnovo automatico, ma che ogni volta viene effettuata una richiesta di pagamento sui dati di contatto lasciati (vedi [subscription-management.md](subscription-management.md)); e quindi, senza dati di contatto, l'abbonamento non potrà mai essere rinnovato, quindi tanto vale rimuoverlo dal carrello.

### Altre caselle di controllo del cliente

Quando si valida un ordine POS, le caselle di controllo obbligatorie del percorso cliente rimangono da validare:
- accettazione delle condizioni generali di vendita e utilizzo
- (se l'opzione è stata attivata - vedi [privacy-management.md](privacy-management.md)) accettazione della memorizzazione dell'IP per i carrelli senza indirizzo di consegna
- (se l'ordine include un articolo pagato in acconto - vedi [payment-on-deposit.md](payment-on-deposit.md)) impegno a pagare il saldo dell'ordine nei tempi previsti
- (se l'ordine include una consegna all'estero a 0% senza dazi e dichiarazione doganale obbligatoria successiva - vedi [VAT-configuration.md](VAT-configuration.md)) impegno a rispettare le dichiarazioni doganali

I link in queste opzioni portano alle pagine CMS descritte qui: [required-CMS-pages.md](required-CMS-pages.md).
Poiché i clienti in negozio ovviamente non avranno il tempo di consultare questi documenti nella loro interezza, le alternative sono:
- avere una versione stampata di ognuna di queste pagine stampata e disponibile in negozio:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- indirizzare il cliente al sito per una consultazione esaustiva dopo l'acquisto
- porre al cliente la seguente domanda quando si valida ogni opzione richiesta:
  - Accetti le condizioni generali di vendita?
  - Accetti la registrazione del tuo indirizzo IP nei nostri database per motivi contabili?
  - "Poiché stai pagando in acconto, accetti di pagare il saldo dell'ordine nei tempi previsti quando il nostro team ti contatterà?"
  - "Poiché fai spedire l'ordine all'estero, oggi non paghi l'IVA. Sei consapevole che dovrai pagare l'IVA alla consegna?"

### Optin

Se l'opzione "Display newsletter + commercial prospection option (disabled by default)" è stata attivata in /admin/config (vedi [KYC.md](KYC.md)), questo modulo verrà visualizzato in /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

Queste opzioni devono essere attivate solo se 1/ il cliente ti fornisce il proprio indirizzo email o npub Nostr 2/ gli poni la domanda e ottieni il suo consenso formale, specificando le implicazioni di ogni opzione.
Attivare queste opzioni senza ottenere il consenso esplicito del cliente è tua responsabilità, e nella maggior parte dei casi illegale (oltre a essere una totale mancanza di rispetto per la raccolta di dati personali del cliente per uso commerciale senza il suo consenso).

## Specifiche dell'ordine (/order)

### Pagamento Punto Vendita

In attesa della creazione dei sottotipi di pagamento Punto Vendita, il pagamento Punto Vendita include tutti i pagamenti non-be-BOP:
- utilizzo di un terminale POS fisico (non riconciliamo ancora automaticamente con i terminali POS Sum Up, anche se l'account del sito e l'account del terminale POS sono condivisi)
- contanti
- assegno (per i paesi che lo utilizzano ancora)
- twint (per il momento, l'integrazione sarà possibile un giorno)
- lingotti d'oro
- ecc.

L'account POS ha quindi una validazione manuale (o annullamento) dell'ordine, con una ricevuta obbligatoria:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

I dettagli vengono memorizzati nell'oggetto ordine e dovrebbero facilitare la riconciliazione contabile.

Ad esempio, puoi indicare:
- "Contanti: dati 350€, restituiti 43,53€".
- "Assegno n. XXXXX, ricevuta archiviata nella cartella B2".
- "Twint: transazione XXX"
- "Sum Up: transazione XXX"

Per recuperare il numero di transazione Sum Up per un pagamento con terminale POS fisico, puoi trovarlo qui nell'applicazione collegata al TPE consultando la transazione:
![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Una volta ricevuto il pagamento, puoi compilare e validare il campo e accedere alla fattura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 Se desideri esportare la fattura come file PDF, puoi selezionare "Salva come PDF" come destinazione di stampa (beBOP non supporta nativamente la generazione di documenti PDF al momento).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 Se stai stampando la fattura e non vuoi etichette relative al browser sulla stampa, puoi disabilitare l'opzione "Intestazioni e piè di pagina" nelle opzioni delle impostazioni di stampa.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Pagamento multiplo

Se hai scelto questa opzione su /checkout:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

Puoi utilizzare la funzione "Send a payment request" per suddividere l'ordine in più pagamenti.

Immaginiamo che su questo ordine, 30€ siano pagati con carta di credito tramite un terminale POS, 20€ in Lightning e 6,42€ in contanti:

1/ Incassa i 30€ con carta di credito tramite il tuo terminale POS poi valida il pagamento

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Poi i 20€ in Lightning:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

E infine, una volta validata la transazione, il resto in contanti:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Una volta raggiunto l'importo totale, l'ordine verrà contrassegnato come "validato".

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Display lato cliente

Mentre sei dietro il PC della cassa, puoi fornire un display lato cliente in modo che possa seguire il proprio ordine.
Puoi scegliere tra:
- uno schermo aggiuntivo collegato tramite HDMI: in questo caso, apri una scheda sull'URL /pos/session dall'account del cassiere, poi visualizza lo schermo in modalità a schermo intero (spesso F11) per rimuovere l'intestazione del browser
- un altro dispositivo con un browser web, come un tablet o un telefono; in questo caso, devi:
  - andare su /admin/login (con URL admin sicuro)
  - accedere con lo stesso account POS
  - visualizzare la pagina /pos/session
  - disabilitare la modalità sleep del dispositivo
  - vedere (a seconda del dispositivo) come passare la pagina web a schermo intero

Quando un carrello è vuoto e nessun ordine è in sospeso, verrà visualizzata una schermata di attesa e benvenuto:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

Non appena un articolo viene aggiunto al carrello dalla cassa, il display si aggiorna e mostra il carrello alla persona che effettua l'acquisto:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### Durante un pagamento Lightning

Il QR Code viene visualizzato per la scansione e il pagamento.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### Durante un pagamento Bitcoin on-chain

(Non raccomandiamo l'uso del pagamento on-chain in negozio, a meno che tu non abbia un basso numero di verifiche, o se hai tempo per intrattenere il tuo cliente per 15 minuti con un caffè mentre le validazioni avvengono).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### Durante un pagamento con carta di credito Sum Up al di fuori di un terminale POS

Se il tuo terminale POS fisico è fuori uso, il tuo cliente può scansionare un QR Code con il proprio telefono per ottenere un modulo CB sul proprio dispositivo (il che è più comodo che fargli digitare le informazioni della sua CB sul tuo PC della cassa...).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### Quando un pagamento Lightning / Bitcoin on-chain / CB Sum Up tramite QR Code viene validato

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

Il display torna quindi alla visualizzazione di benvenuto/attesa, con il messaggio di benvenuto e il logo be-BOP.

### Quando viene effettuato un pagamento Punto Vendita

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Una volta che l'ordine è stato validato manualmente alla cassa:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

E infine, la schermata iniziale/di attesa:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### Nel caso di pagamenti multipli alla cassa:

Finché non è stata effettuata nessuna registrazione:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

Se effettuo un pagamento iniziale (Punto vendita, per contanti):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

Invece della pagina di conferma, si torna alla pagina con il saldo restante aggiornato:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

E si prosegue con i pagamenti successivi (qui Lightning):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Una volta che l'ordine è stato pagato per intero:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

E infine, la schermata iniziale/di attesa:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
