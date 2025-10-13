# Point of Sale option

## Introduction

be-BOP allows you to interact with your community on the Internet, and can also be used as a cash register software (in a stand or store).

POS: Point Of Sale (for store checkout behavior)

By using the POS role and assigning it to a profile [team-access-management.md](team-access-management.md), you can give a checkout profile additional options for specific purchase options.
Using the POS account also enables you to have a customer display to show :
- a home page
- In real time displayed shopping cart
- the payment QR code (Bitcoin, Lightning or CB Sum Up) once the order has been validated
- a validation page once payment has been confirmed

## POS account management

The point-of-sale role is configured by default in the /admin/arm module:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/33f053f0-2788-420d-a0a1-78a7b63a83a2)

## Login to POS account

Once assigned to a profile, the person with POS access must go to the login page in administration (/admin/login , where /admin is the secure string configured by the be-BOP owner (see [back-office-access.md](back-office-access.md) ) and log in.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/0e0f9eef-69cd-4c88-9402-3ed1fd3167e5)

(In the case of a store, it is preferable to choose a connection maintenance time of "1 day", to avoid disconnections in the middle of a sales session).

## Using the POS account

Once logged in, the POS user links to the URL /pos :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/5adbfc75-9f68-43d7-8b3e-41f62c69f191)

The /pos/session session links to the client-side display (see after "Client display").
The display of the latest transactions enables us to provide after-sales service in the event of a customer request.
If the POS account has been configured in this way in the ARM, it can manually access the /admin pages in another tab.

## Add cart

The products accessible to the POS account are those configured in the product channel selector ( [Retail (POS logged seat)](Retail (POS logged seat) ) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/3532db97-ed8a-4b02-aca1-15952874db22)

The options activated in the "Retail (POS logged seat)" column will apply exclusively to the POS account.

### Catalog browsing

The cashier can add products either :
- via CMS pages displaying product widgets (see [build-cms-pages-with-widget.md](build-cms-pages-with-widget.md) )
- by accessing the /catalog page displaying all eligible items via the selector channel

The journey to the shopping basket is then similar to that of any other user on the web.

### Quick add via Aliases

An alias can be added to each product ( [product-alias-management.md](product-alias-management.md) ).
If the items you sell have a barcode (type ISBN / EAN13), this can be entered as an alias.

In the shopping cart, the POS account has an option not available to the average user: by going directly to the shopping cart page (/cart), the POS account has a field for entering an alias (manually, or via a USB handheld).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/b8fcbe75-20ad-4294-be26-d89b8d511f3b)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/de6a9a3d-6dd5-48dd-97b3-c78cbcc65673)

After validation with "enter" :__

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/15b641e4-62ea-4a6b-9971-853933aa7a91)

The "Alias" field is removed to allow the next item to be scanned more quickly.

In case of a cart addition error, the error will be notified and the Alias field will be emptied:
- Maximum number of cart lines already reached: "Cart has too many items".
- Alias non-existent: "Product not found".
- Stock sold out: "Product is out of stock".
- Subscription" item added 2 times: the item is not added a 2nd time (subscription items have a fixed quantity of 1).
- Item with future release but unauthorized pre-order: "Product is not available for pre-order".
- Item with cart addition disabled in selector channel: "Product can't be added to basket".
- Item with purchase order quantity limit already reached:
  - If not a "Stand alone" item: "You can only order X of this product".
  - "Cannot order more than 2 of product: Cheap" (at the moment we have a bug with this control, the item is added and the message is displayed after cart refresh, and cart validation returns to /cart with the error message)
- Item not available for delivery in your destination country: the item is added, but the message "Delivery is not available in your country for some items in your basket" is displayed at the bottom of the basket.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/376b83c9-29fd-485a-8b5d-dccfa1f97813)

Note that when adding a PWYW item via alias, the product amount will be the minimum amount configured on the product.

## Tunnel specificities (/checkout)

The POS account offers additional options:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f5ee032d-80ab-4ce9-b7d8-69fa778071c4)

### Shipping

The address form is optional, as long as a country (depending on the store) is selected, all other fields are optional (in the case of a customer who buys, collects directly from the store and does not require a nominative invoice).
- If the customer requires delivery, the address form can be filled in.
- If the customer requires an invoice, the "My delivery address and billing address are different" option can be used to fill in the invoice.

### Offer free shipping
By default, all orders with items that have a physical counterpart are considered to be in delivery.
The administrator (or anyone else with write access to /admin/config ) can enable this option in /admin/config/delivery (see [delivery-management.md](delivery-management.md) ).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/812301c5-99c6-4bcb-8976-474fd15c22d4)

If the "Allow voiding delivery fees on POS sale" option is enabled, this option will be available on the /checkout page for the POS account:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/02e50a5e-e60e-4648-85e8-78026d07b4cc)

If the option is activated, a compulsory justification must be completed, for managerial follow-up:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/13d841c0-0d41-47b2-a25d-b5e3015b3873)

The amount (shipping costs + related vat) will be deducted on the next page (page/checkout prices are not yet updated in real time according to the POS options applied).

### Multiple payment or store payment

The POS account allows you to use :
- classic payments offered on the site that have been activated and are eligible ( [payment-management.md](payment-management.md ) for all products in the basket 
- Point of Sale payment, which includes all payments outside the beBOP system

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/23185560-a3bf-4aab-8268-dd93fbbea47c)

If "Use multiple payment methods" is activated, the choice of payment method is no longer necessary (see "Order details (/order)" below).

When using conventional payment (CB Sum Up, Lightning or Bitcoin on-chain), the payment QR code will be displayed on the customer device (see "Customer-side display" below).
If a bank transfer is used, the order will be suspended and validated once the transfer has been received manually (not recommended for in-store payments).

If you use the "Point of sale" payment method (single payment), you must enter the payment method manually (see "Order details (/order)" below).

### VAT exemption

A POS account can choose to invoice a customer without VAT (for example, in France, a business customer).
⚖️ Your local law must authorize the use of this option, for which you are responsible.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7936ed4a-8d80-4e4d-bd1a-0090348236d8)

If the option is activated, a compulsory justification must be completed, for managerial follow-up:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f5187336-265e-4b6b-ad2b-8a637b6e46de)

The sum (global VAT) will be deducted on the next page (the prices on the /checkout page are not yet updated in real time according to the POS options applied).

### Applying a gift discount

A POS account can choose to apply a discount to a customer:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d0b86f91-5b8b-4059-b909-a4b43cd55abb)

If the option is activated, a compulsory justification must be completed, for managerial follow-up:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/92e8c899-f1bd-4afa-ab0f-54e26180324f)

You must also choose the type of reduction:
- in %age (an error message will be displayed in case of invalid entry, or 100% reduction)
- in amount corresponding to the be-BOP's main currency (see [currency-management.md](currency-management.md) ) (an error message will be displayed in the event of an invalid entry, or a reduction of corresponding to the order total)

⚖️ Your local law must authorize the use of this option and its maximum amounts, for which you are responsible (e.g. single price law in France).

⚠️ While waiting for the amounts to be updated in real time on the /checkout page, beware of cumulating reduciton + VAT exemption + withdrawal of shipping costs.
While not inadvisable, combining functions requires a minimum of attention.

### Optional customer contact

Normally, in eshop mode, it is necessary to leave either an email address or a Nostr npub in order to receive notifications of your order and retain the access URL.
In POS mode, these fields are optional if a customer refuses to leave his contact details:
- In this case, however, inform customers that they will have to go through the store's support system to find the URL for their order summary, invoices and downloadable files.
- Provide a printer to print the invoice after purchase.
- If the shopping cart includes a subscription, explain that it's not an automatic renewal, but that each time a call for payment is made on the contact details left (see [subscription-management.md](subscription-management.md) ); and therefore, without contact details, the subscription can never be renewed, so you might as well remove it from the shopping cart.

### Other customer checkboxes

When validating a POS order, the obligatory checkboxes of the customer path remain to be validated:
- acceptance of the general terms and conditions of sale and use
- (if the option has been activated - see [privacy-management.md](privacy-management.md) ) acceptance of IP storage for shopping baskets without delivery address
- (if the order includes an item paid on account - see [payment-on-deposit.md](payment-on-deposit.md) ) commitment to pay the remainder of the order on time
- (if the order includes a foreign delivery at 0% duty-free and compulsory customs declaration afterwards - see [VAT-configuration.md](VAT-configuration.md) ) commitment to comply with customs declarations

The links in these options lead to the CMS pages described here: [required-CMS-pages.md](required-CMS-pages.md).
Since in-store shoppers will obviously not have the time to consult these documents in their entirety, the alternatives are :
- to have a printed version of each of these pages printed and available in-store:
  /terms
  /privacy
  /why-vat-customs
  /why-collect-ip
  /why-pay-reminder
- refer the customer to the site for exhautive consultation after the fact
- ask the customer the following question when validating each required option:
  - Do you accept the general sales conditions?
  - Do you agree to the recording of your IP address in our databases for accounting purposes?
  - "As you are paying on account, do you agree to pay the remainder of the order on time when our team contacts you again?"
  - "As you're having your order delivered abroad, you don't pay VAT today. Are you aware that you'll have to pay VAT on delivery?"

### Optin

If the "Display newsletter + commercial prospection option (disabled by default)" option has been activated in /admin/config (see [KYC.md](KYC.md) ), this form will be displayed in /checkout :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43b728b3-a201-443b-aaa3-d1ff81043819)

These options only need to be activated 1/ if the customer provides you with their email address or Nostr npub 2/ you ask them the question and obtain their formal agreement, specifying the implications of each option.
Activating these options without obtaining the customer's explicit consent is your responsibility, and most of the time illegal (in addition to being a complete lack of respect for the collection of personal customer data for commercial use without the customer's consent).

## Order specifications (/order)

### Point of Sale Payment

Pending the creation of Point of Sale payment subtypes, Point of Sale payment includes all non-be-BOP payments:
- use of a physical POS terminal (we do not yet automatically reconcile with Sum UP POS terminals, even if the site account and the POS terminal account are shared)
- cash
- cheque (for countries still using it)
- twint (for the moment, integration will be possible one day)
- gold bullion
- etc

The POS account therefore has a manual validation (or cancellation) of the order, with a mandatory receipt:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9df68cc3-aaac-42b4-9ecc-84a764faa97b)

The details are stored in the order object and should make accounting reconciliation easier.

For example, you can indicate:
- "Cash: given €350, returned €43.53".
- Cheque no. XXXXX, receipt stored in B2 folder".
- Twint: transaction XXX
- "Sum Up: transaction XXX"

To retrieve the Sum Up transaction number for a physical POS terminal payment, you can find it here in the application linked to the TPE by consulting the transaction:
![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/72e820aa-5782-4f5d-ab5a-ffbfc163cd55)

Once the payment has been received, you can fill in and validate the field and access the invoice:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cd33e420-456a-43fb-bd00-dfd1628d3bb9)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e99ab058-f739-47f7-8082-0c5580c7fc08)

💡 If you wish to export the invoice as a PDF file, you can select "Save as PDF" as the print destination (beBOP does not natively support PDF document generation at present).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/92822dc4-291f-4acd-9bd2-726ef3cab469)

💡 If you're printing the invoice and don't want browser-related labels on the printout, you can disable the "Headers and footers" option in Print settings options

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/dd41316b-8d1a-4fff-8782-7752dc921609)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f923a91b-fe26-42ad-9a17-a40dbf028f76)

### Multiple payment

If you have chosen this option at /checkout :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7c2fcf01-adf5-46d4-9188-1dc3a8e5b216)

You can use the "Send a payment request" function to split the order into several payments.

Let's imagine that on this order, 30€ are paid by credit card with a POS Terminal, 20€ by lightning, and 6.42€ in cash:

1/ Redeem the €30 by credit card via your POS terminal then validate the payment

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cff968d5-8256-44b4-ad76-9ae0f17dd207)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f658ca90-4369-479a-a292-1f870f65023f)

Then the 20€ in Lightning :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e1e31ff7-1b16-4c03-a57b-f0955e652e7d)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2d5b22b5-8f01-4391-aa1d-4df9d4694195)

And finally, once the transaction has been validated, the rest in cash:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/51b9a402-11df-4ec7-90f0-1ae8beee4558)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e5bf9423-deab-43a0-a0b3-1504cdd6153f)

Once the full amount has been reached, the order will be marked as "validated".

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/331e9423-b47a-4bf2-b184-53c020ea0b6c)

## Customer-side display

While you're behind your checkout PC, you can provide a customer-side display so that he or she can track their order.
You can choose between :
- an additional screen connected via HDMI: in this case, open a tab on the url /pos/session from the cashier account, then display the screen in full page mode (often F11) to remove the browser header
- another device with a web browser, such as a tablet or phone; in this case, you need to :
  - go to /admin/login (with secure admin URL)
  - log in with the same POS account
  - display the /pos/session page
  - disable device sleep mode
  - see (depending on device) to switch web page to full screen

When a cart is empty and no order is pending, a waiting and welcome screen will be displayed:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fe5bec3d-295e-4cdf-8ebc-d79a6ce1e62e)

As soon as an item is added to the cart from the checkout, the display updates and shows the shopping cart to the person making the purchase:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/1fd03a7b-e7bb-4820-9725-7c12115732d2)

### When making a Lightning payment

The QR Code is displayed for scanning and payment.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/e1e2933b-876b-442c-8964-24bba4390488)

### When making an on-chain Bitcoin payment

(We don't recommend the use of on-chain payment in-store, unless you have a low number of verifications, or if you have the time to occupy your customer for 15 minutes with a coffee while the validations take place).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/b7efdde9-8049-43d3-a1c4-83579908b8d7)

### When making a Sum Up credit card payment outside an POS terminal

If your physical POS terminal is out of order, your customer can scan a QR Code with his phone to get a CB form on his own device (which is more convenient than having him type his CB information on your checkout PC...).

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/15a3bd1a-26c9-4ac3-b10b-1bd713544157)

### When a Lightning / Bitcoin on-chain / CB Sum Up by QR Code payment is validated

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43f192a5-30ab-44bd-87f3-c60c1d5fad14)

The display then returns to the welcome/standby display, with the welcome message and be-BOP logo.

### When a Point of Sale payment is made

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2e30fcac-32b1-4b11-ae6f-3f28e0a8abcd)

Once the order has been manually validated at the checkout :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/bece3fd9-e599-4a11-b4ab-5a1f62c6055c)

And finally, the home/standby screen:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)

### In the case of multiple payments at the cash desk :

As long as no entry has been made :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f2800284-3858-4a42-a4d8-c86cce0b08e4)

If I make an initial payment (Point of sale, for cash) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/806f8042-2fae-4c01-a3b8-f4e23123f0fb)

Instead of the confirmation page, you return to the page with the updated remaining balance:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f2472cdb-40a4-412f-a66e-39d9b80d7ba4)

And continue with the next payments (here Lightning):

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fdde5aad-cd65-4953-ae29-a46a79e018a7)

Once the order has been paid in full :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/50b230b7-a539-40f4-98ff-244ef46e0bb7)

And finally, the home/standby screen:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/9f155163-4d06-4d66-a2b8-f029a3d9884c)
