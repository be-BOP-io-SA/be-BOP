# Initialize your be-BOP

Quick dirty summary before cleaner documentation

Once your be-BOP is up (don't forget the readme.md) :

## Super-admin account

- Go to your-site/admin/login
- create your superadmin account & password

## /admin/config (via Admin / Config)

### Protect your back-office access

Go to /admin/config, go to "Admin hash", define a hash, and save.
Now, the backoffice address is /admin-yourhash

### Make your be-BOP into maintenance mode

Go to /admin/config, check "Enable maintenance mode".
You can an any IPv4 comma-separated to allow access to the front-office.
The back-office will always be open.

### Define your currencies
Go to /admin/config :
- main currency is used to be displayed on front & invoices
- second currency is optional and is used to be displayed on front
- price reference currency is the default currency you'll create your price on, but you'll be able to change that product per product
  - by clicking the red button and confirming, your product currencies will be overwritten to the chosen selection, but the price won't be updated
- accounting currency allows for full BTC currency be-BOP to save the exchange rate of Bitcoin at the time of the order.

### Timing

Subscription duration is used for subscription product, you can choose month, week or day.
Subscription reminder is the delay between the sent of the new invoice proposal and the and of the subscription.

### Confirmation blocks

For Bitcoin on-chain payments, you can either define a standard number of verification for transaction.
But with "Manage confirmation thresholds", you'll be able to do that depending of the price, for example :
- < 100€ : 0 confirmation
- 100€ to 1000€ : 1 confirmation
- 1000€ to 9999999999999€ : 2 confirmations
etc

### Order expiration

"Set desired timeout for payment (in minute)" allows to cancel an order on be-BOP system if the transaction wasn't paid or verified enough.
It's only for Bitcoin-onchain, Lightning and Credit card by sum up.
A too short time will oblige you to have short / null onchain confirmation block target.
A too long time will block your products stock while the order is pending.

### Stock reservation
To avoid stock squatting, you can set "How much time a cart reserves the stock (in minutes)".
When I add a product to my cart, if it's the last, no one will be able to.
But, if I don't process my order and if I wait more than the define time, the product will be available again, and removed from my basket if someone else buys it.

### TBD

## /admin/identity (via Config / Identity)

Here, every information about your company will be use for invoices and receipts.

"Invoice Information" is optionnal and will be added on the top-right of the receipt.

To allow "bank transfer" payment mean, you need to fill you "Bank account" IBAN and BIC.

Contact information email will be used as "send as" for email and displayed on the footer.

## /admin/nostr (through Node management / Nostr)

Go do /admin/nostr (through Node managemen / Nostr) then clic on "Create nsec" if you don't have already one.
Then, you can add it on the .env.local before (see readme.md)

## /admin/sumup (through Payment partner / Sum Up)

Once you have your Sum Up account, use their dev interface and copy he API key here.
Merchand code can be found on your dashboard, or previous transactions receipts from you.
Currency is the currency of your Sum Up account (in general, from the country your company is from).

# The rest

For now, and thinkgs outside the back-office, don't forget the readme.md.

Governant chart will be published soon, but, tl;dr, each pull request will be reviewed by :
- coyote (CTO)
- tirodem (CPO / QA)
- ludom (CEO)
And if we're OK, we'll merge.

We'll refuse ultra-specific needs and go for genetic features that can be used by the largest number of people.
