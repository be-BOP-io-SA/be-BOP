# Customize your order tunnel

The tunnel consists of 3 successive pages:
- /cart (the shopping cart)
- /checkout (delivery page, payment method and contact)
- /order (order summary page, call for payment and access to invoice and downloadable files)

Each of these pages can be enhanced by integrating content from a CMS page.
These pages are :

For the shopping cart (/cart]
  /basket-top
  /basket-bottom
For the tunnel (/checkout)
/checkout-top
/checkout-bottom
For the order page (/order)
  /order-top
  /order-bottom

Content is displayed in this way (here, using a tag [Picture=ID] in every CMS page, see [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

All CMS content can be used (slider, thank-you image, contact form on the checkout page, etc.).

However, it's not advisable to integrate text links or widgets with CTAs (Tag or Product), for cross-selling or other reasons. Once at the /cart, any exit from the order tunnel is likely to result in a non-finalized order and a drop in the conversion rate.

The recommended widgets are :
- standard CMS content without hypertext links
- the [Picture=ID] widget
- the [Slider=ID] widget
- the [Form=ID] widget, particularly on the /order-bottom page

And don't overload these integrated CMS pages, or you'll lose the user and make them abandon their order.
