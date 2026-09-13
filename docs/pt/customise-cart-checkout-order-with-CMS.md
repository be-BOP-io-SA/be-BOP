# Personalize o seu túnel de pedidos

O túnel é composto por 3 páginas sucessivas:
- /cart (o carrinho de compras)
- /checkout (página de entrega, método de pagamento e contacto)
- /order (página de resumo do pedido, chamada para pagamento e acesso à fatura e ficheiros descarregáveis)

Cada uma destas páginas pode ser enriquecida integrando conteúdo de uma página CMS.
Estas páginas são:

Para o carrinho de compras (/cart]
  /basket-top
  /basket-bottom
Para o túnel (/checkout)
/checkout-top
/checkout-bottom
Para a página de pedido (/order)
  /order-top
  /order-bottom

O conteúdo é exibido desta forma (aqui, usando uma tag [Picture=ID] em cada página CMS, veja [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md).

/cart

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/394ac0e9-2b27-477f-b081-66dab57abb69)

/checkout

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ecca6d51-10e5-448e-8df6-62481851ff08)

/order

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c1c82aae-4de2-484f-9187-31082bcf8ba4)

Todo o conteúdo CMS pode ser usado (slider, imagem de agradecimento, formulário de contacto na página de checkout, etc.).

No entanto, não é aconselhável integrar links de texto ou widgets com CTAs (Tag ou Produto), para cross-selling ou outros motivos. Uma vez no /cart, qualquer saída do túnel de pedidos provavelmente resultará num pedido não finalizado e numa queda na taxa de conversão.

Os widgets recomendados são:
- conteúdo CMS padrão sem links de hipertexto
- o widget [Picture=ID]
- o widget [Slider=ID]
- o widget [Form=ID], particularmente na página /order-bottom

E não sobrecarregue estas páginas CMS integradas, ou perderá o utilizador e fará com que abandone o seu pedido.
