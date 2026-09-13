# Uw besteltunnel aanpassen

De tunnel bestaat uit 3 opeenvolgende pagina's:
- /cart (het winkelwagentje)
- /checkout (leveringspagina, betaalmethode en contactgegevens)
- /order (overzichtspagina van de bestelling, betaalverzoek en toegang tot factuur en downloadbare bestanden)

Elk van deze pagina's kan worden verrijkt door inhoud van een CMS-pagina te integreren.
Deze pagina's zijn:

Voor het winkelwagentje (/cart)
  /basket-top
  /basket-bottom
Voor de tunnel (/checkout)
/checkout-top
/checkout-bottom
Voor de bestelpagina (/order)
  /order-top
  /order-bottom

Inhoud wordt op deze manier weergegeven (hier met een tag [Picture=ID] op elke CMS-pagina, zie [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Alle CMS-inhoud kan worden gebruikt (slider, bedankafbeelding, contactformulier op de checkoutpagina, enz.).

Het is echter niet aan te raden om tekstlinks of widgets met CTA's (Tag of Product) te integreren, voor cross-selling of andere doeleinden. Zodra men bij /cart is, zal elk verlaten van de besteltunnel waarschijnlijk resulteren in een niet-afgeronde bestelling en een daling van het conversiepercentage.

De aanbevolen widgets zijn:
- standaard CMS-inhoud zonder hypertekstlinks
- de [Picture=ID]-widget
- de [Slider=ID]-widget
- de [Form=ID]-widget, met name op de /order-bottom pagina

En overlaad deze geintegreerde CMS-pagina's niet, anders verliest u de gebruiker en laat u deze de bestelling afbreken.
