# Bestelltunnel anpassen

Der Tunnel besteht aus 3 aufeinanderfolgenden Seiten:
- /cart (der Warenkorb)
- /checkout (Lieferseite, Zahlungsmethode und Kontakt)
- /order (Bestellübersichtsseite, Zahlungsaufforderung und Zugang zu Rechnung und herunterladbaren Dateien)

Jede dieser Seiten kann durch die Integration von Inhalten einer CMS-Seite erweitert werden.
Diese Seiten sind:

Für den Warenkorb (/cart]
  /basket-top
  /basket-bottom
Für den Tunnel (/checkout)
/checkout-top
/checkout-bottom
Für die Bestellseite (/order)
  /order-top
  /order-bottom

Inhalte werden folgendermaßen angezeigt (hier unter Verwendung eines Tags [Picture=ID] auf jeder CMS-Seite, siehe [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Alle CMS-Inhalte können verwendet werden (Slider, Dankeschön-Bild, Kontaktformular auf der Checkout-Seite usw.).

Es ist jedoch nicht empfehlenswert, Textlinks oder Widgets mit CTAs (Tag oder Produkt) zu integrieren, sei es für Cross-Selling oder andere Zwecke. Sobald der Kunde bei /cart angekommen ist, führt jedes Verlassen des Bestelltunnels wahrscheinlich zu einer nicht abgeschlossenen Bestellung und einem Rückgang der Konversionsrate.

Die empfohlenen Widgets sind:
- Standard-CMS-Inhalte ohne Hyperlinks
- Das Widget [Picture=ID]
- Das Widget [Slider=ID]
- Das Widget [Form=ID], insbesondere auf der Seite /order-bottom

Überladen Sie diese integrierten CMS-Seiten nicht, sonst verlieren Sie den Nutzer und veranlassen ihn, seine Bestellung abzubrechen.
