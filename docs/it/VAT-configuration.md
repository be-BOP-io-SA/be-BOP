# Gestione dei Regimi e delle Aliquote IVA

## Introduzione

Nativamente, be-BOP mostra i prezzi al netto delle imposte.
I calcoli IVA vengono eseguiti a partire dal carrello.

Esistono 3 principali regimi IVA, più una variazione:
- Esenzione con giustificazione
- Vendita con aliquota IVA del paese del venditore
- Vendita con aliquota IVA del paese dell'acquirente
- Vendita con aliquota IVA del paese del venditore con esenzione per gli acquirenti che ricevono la merce all'estero, soggetta a dichiarazione di pagamento IVA nel proprio paese tramite i propri servizi doganali

Per controlli fiscali, conformità legale e contabilità, è talvolta necessario raccogliere dati relativi al cliente per giustificare un'eventuale esenzione IVA.
Questi punti sono trattati in [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Caso 1: Esenzione IVA con Giustificazione

In /admin/config si trova l'opzione **Disable VAT for my be-BOP**.
Una volta spuntata la casella, **un'IVA dello 0% viene applicata a tutti gli ordini futuri**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

L'attivazione di questa opzione attiva la sotto-opzione **VAT exemption reason (appears on the invoice)**.
Questo è il testo legale da compilare per giustificare l'assenza di IVA al cliente.
Ad esempio, in Francia:
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (prestazione di servizi intracomunitaria)

La motivazione fornita sarà quindi indicata su ciascuna delle vostre fatture.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Caso 2A: Vendita con Aliquota IVA del Paese del Venditore

In /admin/config si trova l'opzione **Use VAT rate from seller's country (always true for products that are digital goods)**.
È poi necessario scegliere il paese a cui è associata la vostra azienda nell'opzione **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

In questo modo:
- L'aliquota IVA mostrata nel carrello sarà quella del paese della vostra azienda (con un indicatore che ricorda questo paese)
- L'aliquota IVA mostrata nella pagina di checkout sarà quella del paese della vostra azienda (con un indicatore che ricorda questo paese)
- L'aliquota IVA mostrata sull'ordine sarà quella del paese della vostra azienda (con un indicatore che ricorda questo paese)
- L'aliquota IVA mostrata sulla fattura sarà quella del paese della vostra azienda

## Caso 2B: Vendita con Aliquota IVA del Paese del Venditore con Esenzione per Consegna di Articoli Fisici all'Estero

Nel caso precedente, in /admin/config, se si attiva l'opzione **Make VAT = 0% for deliveries outside seller's country**, le regole rimarranno le stesse per i clienti che ricevono la merce nel paese della vostra azienda.

Lo stesso vale per l'acquisto di articoli scaricabili, donazioni o abbonamenti (l'aliquota IVA applicata sarà quella del paese della vostra azienda).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

Tuttavia, se il cliente desidera ricevere la merce nel proprio paese (che non è quello della vostra azienda):
- L'aliquota IVA mostrata nel carrello sarà quella del paese in cui è geolocalizzato il suo IP (basata su dati di ip2location.com)
- L'aliquota IVA mostrata nella pagina di checkout sarà quella del paese di consegna scelto dal cliente
- L'aliquota IVA mostrata sull'ordine sarà quella del paese di consegna scelto dal cliente
- L'aliquota IVA mostrata sulla fattura sarà quella del paese di consegna scelto dal cliente
Anche se l'indirizzo di fatturazione del cliente è nel paese della vostra azienda, la consegna all'estero, in determinati regimi, può richiedere il pagamento tramite dichiarazione alla dogana al ricevimento della merce.

Quando questa opzione è attivata, nella pagina di checkout (/checkout), il cliente deve convalidare una nuova opzione obbligatoria: **I understand that I will have to pay VAT upon delivery**.
Questa opzione rimanda alla pagina CMS /why-vat-customs, da creare e completare per spiegare perché il cliente deve pagare l'IVA del proprio paese al ricevimento dell'articolo.

### Cliente che Riceve la Merce nel Paese del be-BOP

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Cliente che Riceve la Merce Altrove

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Caso 3: Vendita con Aliquota IVA del Paese dell'Acquirente

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

Quando in /admin/config nessuna opzione di regime IVA è attivata e un paese IVA è scelto, l'IVA applicata sarà quella del cliente:
- L'aliquota IVA nel carrello sarà quella del paese in cui è geolocalizzato il suo IP (basata su dati di ip2location.com)
- L'aliquota IVA nella pagina di checkout sarà quella del paese di consegna scelto dal cliente, o quella del paese in cui è geolocalizzato il suo IP (basata su dati di ip2location.com) per un carrello senza articoli che richiedono consegna
- L'aliquota IVA sull'ordine sarà quella del paese di consegna scelto dal cliente, o quella del paese in cui è geolocalizzato il suo IP per un carrello senza articoli che richiedono consegna
- L'aliquota IVA sulla fattura sarà quella del paese di consegna scelto dal cliente, o quella del paese in cui è geolocalizzato il suo IP per un carrello senza articoli che richiedono consegna

## L'IP dell'Utente Utilizzato per la Valutazione IVA Viene Memorizzato?
Questi punti sono trattati in [privacy-management.md](/docs/fr/privacy-management.md).
Tuttavia, senza altra configurazione che richieda informazioni del cliente, l'informazione non viene memorizzata: viene recuperata dal browser (poiché fornita da quest'ultimo) e utilizzata per fornire una stima dell'IVA e della spedizione prima che il cliente inserisca il proprio indirizzo postale (una raccomandazione legale imposta da alcuni paesi), ma non viene nativamente memorizzata nei database be-BOP.
D'altra parte, i servizi fiscali e doganali possono richiedere in alcuni paesi una serie di prove che giustifichino il pagamento dell'IVA da parte del cliente quando non è quella del paese del venditore. In questo caso, be-BOP offre alcune opzioni (senza incoraggiarle nativamente).
Si noti che l'IP è considerato un dato di fatturazione valido in alcuni paesi e che il venditore non è responsabile dell'indirizzo IP fornito dal browser del cliente.

## Quale Regime IVA Scegliere?

Il regime IVA della vostra azienda può dipendere da:
- Lo status della vostra azienda
- Il vostro tipo di attività
- Il vostro fatturato annuo
- Altre sottigliezze legali e amministrative

L'approccio più sicuro è consultare il vostro commercialista, avvocato o servizio aziendale competente per determinare il regime IVA target e configurarlo in be-BOP.

## Gestione dei Profili IVA Ridotta

A seconda del paese, alcuni beneficiano di un'aliquota IVA ridotta (prodotti culturali, donazioni ad associazioni o finanziamento di campagne politiche, ecc.).
Per questo, è necessario creare **Custom VAT Rates**.
Il link è accessibile in /admin/config, e su /admin/config/vat:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

È possibile nominare e salvare un profilo, e inserire un'aliquota IVA personalizzata per paese (senza specificazione, verrà applicata l'IVA predefinita).

Esempio di Custom VAT Rate dedicato ai libri:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Poi, nell'interfaccia di amministrazione dei prodotti (/admin/product/{id}), è possibile specificare il profilo IVA desiderato in base al tipo di prodotto:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" utilizzerà per default l'IVA generale del be-BOP.

L'IVA di ogni articolo sarà visualizzata nel carrello:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

E anche sulla fattura:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
