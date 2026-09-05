# Personalizzare il tunnel di acquisto

Il tunnel è composto da 3 pagine successive:
- /cart (il carrello)
- /checkout (pagina di consegna, metodo di pagamento e contatto)
- /order (pagina riepilogo dell'ordine, richiesta di pagamento e accesso alla fattura e ai file scaricabili)

Ognuna di queste pagine può essere arricchita integrando contenuti da una pagina CMS.
Queste pagine sono:

Per il carrello (/cart]
  /basket-top
  /basket-bottom
Per il tunnel (/checkout)
/checkout-top
/checkout-bottom
Per la pagina dell'ordine (/order)
  /order-top
  /order-bottom

Il contenuto viene visualizzato in questo modo (qui, utilizzando un tag [Picture=ID] in ogni pagina CMS, vedi [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Tutti i contenuti CMS possono essere utilizzati (slider, immagine di ringraziamento, modulo di contatto nella pagina di checkout, ecc.).

Tuttavia, non è consigliabile integrare link testuali o widget con CTA (Tag o Prodotto), per cross-selling o altri motivi. Una volta al /cart, qualsiasi uscita dal tunnel di acquisto potrebbe comportare un ordine non finalizzato e un calo del tasso di conversione.

I widget consigliati sono:
- contenuto CMS standard senza link ipertestuali
- il widget [Picture=ID]
- il widget [Slider=ID]
- il widget [Form=ID], in particolare nella pagina /order-bottom

E non sovraccaricare queste pagine CMS integrate, altrimenti perderai l'utente e lo farai abbandonare l'ordine.
