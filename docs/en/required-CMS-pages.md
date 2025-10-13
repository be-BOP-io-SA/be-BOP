# Mandatory CMS pages

## Introduction

be-BOP natively uses certain mandatory pages to display various texts (such as legal notices), the homepage or error pages.
These pages are CMS pages that can be customized in /admin/CMS like any other rich content page.

The slugs for these pages are :
- /home
- /error
- /maintenance
- /terms
- /privacy
- /why-vat-customs
- /why-collect-ip
- /why-pay-reminder
- /order-top
- /order-bottom
- /checkout-top
- /checkout-bottom
- /basket-top
- /basket-bottom

## /home - Homepage
This page is displayed when accessing the root of your site (/).
Serving as a showcase for your company, it should (or can, depending on taste), in summary :
- present your brand
- present your values
- present your news
- highlight certain articles
- allow you to browse the rest of your site as you go, without having to return to the menus
- present your graphic identity
- allow people to contact you
- not be overloaded
While each of these points can be developed in its own CMS page, a vertical reading of your homepage should make visitors want to discover the rest of your site.

## /error - Error page
If you want it to be displayed as little as possible, it's always better to redirect your user to content rather than a raw error message.
This can take the form of :
- an apology message (essential)
- a contact form to report the anomaly encountered
- a link to a selection of products, a news page or the homepage

## /maintenance - Maintenance page
See [maintenance-whitelist.md](/docs/en/maintenance-whitelist.md)
When you're carrying out work on your site or need to restrict access for migration, backup or other operations, you can put your site on maintenance.
The entire public (modulo a list of visitors whose IP has been whitelisted), when trying to access any page on your site, will be redirected to the /maintenance page.
You can include :
- an explanation of the site's closure
- a teaser about the new features that will come with the reopenings
- a contact form
- visuals
- links to other sites or social networks

## /terms - Terms of use
CThis page is usually displayed in the site footer links, and is also displayed in the checkout tunnel with the compulsory checkbox **I agree to the terms of service**.
The link to this compulsory option in the tunnel (/checkout) leads to /terms, giving your visitors access to all the terms and conditions of sale and use.
Filling in this page is tedious, but nonetheless mandatory!

## /privacy - Privacy policy
See [privacy-management.md](/docs/en/privacy-management.md)
This page is usually displayed in the site footer links.
It lets your visitors know all the conditions governing the use of their personal information, compliance with the RGPD, cookie collection, etc.
The only cookie present (bootik-session) on be-BOP is the session cookie, which is essential for proper operation.
We do not use advertising cookies.
A second cookie (lang) is present to store your choice of language.
As the owner, you can collect more information (billing information, IP address) for legal and accounting reasons: please explain on this page.
What's more, although optins for commercial canvassing are natively deactivated on be-BOP, it is possible to present them (deactivated) to the customer, and you must undertake to respect the customer's choice as to what he chooses or not in his optins.
Filling in this page is tedious, but nonetheless mandatory and ethical towards your visitors!

## /why-vat-customs - Payment to customs on receipt
See [VAT-configuration.md](/docs/en/VAT-configuration.md)
Under the 2B VAT regime (sale at the VAT rate of the seller's country and exemption for the delivery of physical items abroad), the customer must validate a new mandatory option: I understand that I will have to pay VAT upon delivery. This option links to the CMS /why-vat-customs page, which must be created and completed to explain why your customer must pay VAT in their country upon receipt of your item.

## /why-collect-ip - Justification for collecting IP
See [privacy-management.md](/docs/en/privacy-management.md)
If, for accounting or legal reasons, you need to store your customer's IP address for a dematerialized purchase without a postal address (via /admin/config with the **Request IP collection on deliveryless order** option), the customer will be given a mandatory option to complete the order **I agree to the collection of my IP address (why?)**.
The link for this option goes to /why-collect-ip , where it's best to explain why you want to save such data (remembering that customer acceptance is mandatory to finalize the order if you configure your be-BOP in this way).

## /why-pay-reminder - Commitment to pay an order on account
See [order-with-deposit.md](/doc/en/order-with-deposit.md)
When you activate payment on account for one of your items, the first order placed includes only the deposit, but the customer undertakes to pay the seller the remainder of the order amount under the conditions presented.
If your order includes a reservation for an item on account, the link is displayed in the checkout tunnel with the compulsory checkbox **I agree that I need to pay the remainder in the future (why?)**.

## /order-top, /order-bottom, /checkout-top, /checkout-bottom,  /basket-top, /basket-bottom
See [customise-cart-checkout-order-with-CMS.md](customise-cart-checkout-order-with-CMS.md)
