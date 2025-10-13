# Shipping costs management

## Introduction
be-BOP currently offers only one generic shipping method.
However, there are several ways to manage shipping costs.
Shipping costs can be configured :
- globally on /admin/config/delivery
- detailed on /admin/product/{id}

## Management mode
The two main ones are :
- Flat fees: each order is billed a certain amount (defined in /admin/config/delivery), in a defined currency.
  - "Apply flat fee for each item instead of once for the whole order" :  in this mode, the flat fee is applied to each item line rather than to the cart.
- "Fees depending on product" : each product has its own specific shipping costs, which are added to the cart according to the number of items ordered.
  - in this mode, only the delivery fee of the highest item is applied, rather than the total sum.

In all cases, these calculations only concern products for which the option "The product has a physical component that will be shipped to the customer's address" has been activated in /admin/product/{id}.
Shipping costs and flat-rate contributions to shipping costs are not taken into account when calculating product types.

### Item line?
[Screenshot requis]
A customer shopping cart generally contains several lines, each corresponding to a product A in quantity n.
Thus, if I have the following cart :
- Item A qty 2
- Item B qty 3
- Item C qty 4
- Item D qty 8
My cart contains 4 item lines.

In the case of a €10 flat fee configuration, the price of shipping will be €10.
For a "Flat fees" configuration of €10 with the "Apply flat fee for each item instead of once for the whole order" option, the shipping cost will be 4 item lines * €10, i.e. €40.

### Standalone Item
Sometimes, a bulky or fragile item alone justifies separate shipment, insurance, a special package, shipping protection, etc.
When you add the same item A to the shopping cart 2 times, the cart displays a single line with "Item A qty 2".
If you enable the "This is a standalone product" option in /admin/product/{id}, each time you add a product, you'll add it on a single line.
So, if I have an item B (for example a television) and I add it 3 times, my cart becomes :
- Item A qty 2
- Item B
- Item B
- Item B
My cart now contains 4 item lines: 1 Standalone item corresponds to 1 basket line.

## Shipping are
By default, shipping zones and their charges are not defined.
To define a global shipping charge, select "Other countries", add it and set a charge.
If we define a shipment price for country A, another for country B and a final one for "Other Countries", the price set for "Other Countries" will be used by default for all countries that are neither country A nor country B.

## Specific product shipment prices and product shipment restrictions
(TBD)
