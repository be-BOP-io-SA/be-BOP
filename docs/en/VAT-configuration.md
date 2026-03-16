# VAT Regimes and Rates Management

## Introduction

Natively, be-BOP displays prices excluding tax.
VAT calculations are performed from the cart onwards.

There are 3 main VAT regimes, plus one variation:
- Exemption with justification
- Sale under the seller's country VAT rate
- Sale under the buyer's country VAT rate
- Sale under the seller's country VAT rate with exemption for buyers having items delivered abroad, subject to VAT payment declaration in their country through their own customs services

For tax audits, legal compliance, and accounting, it is sometimes necessary to collect customer-related data to justify a potential VAT exemption.
These points are covered in [privacy-management.md](/docs/fr/privacy-management.md).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/69990b7f-a264-4325-a411-246def3454c4)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/c5363c2c-22cf-4d01-8a9e-d0d3e204bef9)

## Case 1: VAT Exemption with Justification

In /admin/config, there is the option **Disable VAT for my be-BOP**.
Once the box is checked, **a 0% VAT is applied to all future orders**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/a86a4edd-e70d-466d-b573-ed0ef9e56025)

Enabling this option activates the sub-option **VAT exemption reason (appears on the invoice)**.
This is the legal text to fill in to justify the absence of VAT to your customer.
For example, in France:
- *TVA non applicable, article 293B du code général des impôts.*
- *Exonération de TVA, article 262 ter, I du CGI*
- *Exonération de TVA, article 298 sexies du CGI*
- *Exonération de TVA, article 283-2 du Code général des impôts".* (intra-community service provision)

The reason provided will then be indicated on each of your invoices.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/e062d151-e141-42a2-88b8-7fffc1a7c0ec)

## Case 2A: Sale at the Seller's Country VAT Rate

In /admin/config, there is the option **Use VAT rate from seller's country (always true for products that are digital goods)**.
You then need to choose the country to which your company is attached in the option **Seller's country for VAT purposes**.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/9822f6da-20de-42fe-af20-c83e033c2e7d)

By doing so:
- The VAT rate shown in the cart will be that of your company's country (with an indicator reminding of this country)
- The VAT rate shown on the checkout page will be that of your company's country (with an indicator reminding of this country)
- The VAT rate shown on the order will be that of your company's country (with an indicator reminding of this country)
- The VAT rate shown on the invoice will be that of your company's country

## Case 2B: Sale at the Seller's Country VAT Rate with Exemption for Physical Item Delivery Abroad

In the previous case, in /admin/config, if you enable the option **Make VAT = 0% for deliveries outside seller's country**, the rules will remain the same for customers having items delivered in your company's country.

The same applies to the purchase of downloadable items, donations, or subscriptions (the VAT rate applied will be that of your company's country).

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/910d6910-cc3c-438b-982d-30c32f329405)

However, if your customer wants their merchandise delivered to their country (which is not your company's country):
- The VAT rate shown in the cart will be that of the country where their IP is geolocated (based on data from ip2location.com)
- The VAT rate shown on the checkout page will be that of the delivery country chosen by the customer
- The VAT rate shown on the order will be that of the delivery country chosen by the customer
- The VAT rate shown on the invoice will be that of the delivery country chosen by the customer
Even if your customer's billing address is in your company's country, delivery abroad, under certain regimes, may require payment via declaration to customs upon receipt of goods.

When this option is enabled, on the checkout page (/checkout), the customer must validate a new mandatory option: **I understand that I will have to pay VAT upon delivery**.
This option links to the CMS page /why-vat-customs, which should be created and completed to explain why your customer must pay their country's VAT upon receiving your item.

### Customer Having Items Delivered in the be-BOP Country

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/5a99fe97-6448-423f-bebb-313e410c6444)

### Customer Having Items Delivered Elsewhere

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/ac7f10e2-ff68-49f3-814d-a3569e112242)

## Case 3: Sale at the Buyer's Country VAT Rate

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/6b96f29f-c309-4106-9c6b-76d7ddf4b554)

When, in /admin/config, no VAT regime option is enabled and a VAT country is chosen, the applied VAT will be the customer's:
- The VAT rate shown in the cart will be that of the country where their IP is geolocated (based on data from ip2location.com)
- The VAT rate shown on the checkout page will be that of the delivery country chosen by the customer, or that of the country where their IP is geolocated (based on data from ip2location.com) for a cart without items requiring delivery
- The VAT rate shown on the order will be that of the delivery country chosen by the customer, or that of the country where their IP is geolocated (based on data from ip2location.com) for a cart without items requiring delivery
- The VAT rate shown on the invoice will be that of the delivery country chosen by the customer, or that of the country where their IP is geolocated (based on data from ip2location.com) for a cart without items requiring delivery

## Is the User's IP Used for VAT Assessment Stored?
These points are covered in [privacy-management.md](/docs/fr/privacy-management.md).
However, without other configuration requiring customer information, the information is not stored: it is retrieved from the browser (as provided by it) and used to give a VAT and shipping estimate before the customer enters their postal address (a legal recommendation imposed by certain countries), but it is not natively stored in be-BOP databases.
On the other hand, tax and border services may require in certain countries a number of proofs justifying the customer's VAT payment when it is not that of the seller's country. In this case, be-BOP offers certain options (without natively encouraging them).
Note that the IP is considered valid billing data in certain countries, and the seller is not responsible for the IP address pushed by the customer's browser.

## Which VAT Regime to Choose?

Your company's VAT regime may depend on:
- Your company's status
- Your type of activity
- Your annual turnover
- Other legal and administrative subtleties

The safest approach is to consult your accountant, lawyer, or relevant business service to determine your target VAT regime and configure it in be-BOP.

## Reduced VAT Profile Management

Depending on the country, some benefit from a reduced VAT rate (cultural products, donations to associations or political campaign funding, etc.).
To do this, you need to create **Custom VAT Rates**.
The link is accessible in /admin/config, and at /admin/config/vat:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/97971eba-b664-47f9-89f2-5a7ce37abb99)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7bf9c28a-944f-4449-8d17-f95892566542)

You can name and save a profile, and enter a custom VAT rate per country (without specification, the default VAT will be applied).

Example of a Custom VAT Rate dedicated to books:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/b3e977d2-fe4d-4e40-9d47-75030b06b1a1)

Then, in the product administration interface (/admin/product/{id}), you can specify the desired VAT profile based on the product type:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/81a8fbe3-8670-4172-a752-537022789304)

"No custom VAT profile" will default to the be-BOP's general VAT.

Each item's VAT will be displayed in the cart:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/931dfd41-9ed5-43e0-b571-2a6d76cec130)

And also on the invoice:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/72863ad5-c4f1-4906-b0d7-69cf5c4df6c9)
