---
id: onboarding
name: Admin onboarding
steps:
  # --- /admin page steps ---
  - id: welcome
    page: /admin
    buttons:
      - text: 'No (n)'
        action: cancel
        key: n
      - text: 'Yes (y)'
        action: next
        key: y
  - id: brand-logo
    page: /admin
    attachTo:
      element: 'header.header a[href="/"]'
      on: bottom
  - id: navbar-intro
    page: /admin
    attachTo:
      element: header.navbar
      on: bottom
  - id: navbar-links
    page: /admin
    attachTo:
      element: header.navbar nav a
      on: bottom
  - id: navbar-cart
    page: /admin
    attachTo:
      element: 'header.navbar a[href="/cart"]'
      on: bottom
  - id: navbar-theme
    page: /admin
    attachTo:
      element: header.navbar .flex.relative button
      on: bottom
  - id: navbar-language
    page: /admin
    attachTo:
      element: header.navbar select
      on: bottom
  - id: admin-header
    page: /admin
    attachTo:
      element: 'a.hover\:underline[href*="admin"]'
      on: bottom
  - id: admin-merch
    page: /admin
    attachTo:
      element: 'a[href="#Merch"]'
      on: bottom
  - id: admin-settings
    page: /admin
    attachTo:
      element: 'a[href="#Settings"]'
      on: bottom
  - id: admin-payment
    page: /admin
    attachTo:
      element: 'a[href="#Payment Settings"]'
      on: bottom
  - id: admin-transaction
    page: /admin
    attachTo:
      element: 'a[href="#Transaction"]'
      on: bottom
  - id: admin-node
    page: /admin
    attachTo:
      element: 'a[href="#Node Management"]'
      on: bottom
  - id: admin-widgets
    page: /admin
    attachTo:
      element: 'a[href="#Widgets"]'
      on: bottom
  - id: admin-logout
    page: /admin
    attachTo:
      element: 'form[action*="logout"] button'
      on: bottom
  - id: backoffice-home
    page: /admin
    attachTo:
      element: main
      on: top
  - id: admin-message
    page: /admin
    attachTo:
      element: 'h1[data-svelte-h="svelte-gs4yz8"]'
      on: bottom
    buttons:
      - text: 'Employee (e)'
        action: 'show:employee-end'
        key: e
      - text: 'Owner (o)'
        action: 'show:owner-ask'
        key: o
  - id: employee-end
    page: /admin
    buttons:
      - text: 'Back (b)'
        action: 'show:admin-message'
        key: b
      - text: 'Done (d)'
        action: complete
        key: d
  - id: owner-ask
    page: /admin
    buttons:
      - text: 'No (n)'
        action: 'show:owner-bye'
        key: n
      - text: 'Yes (y)'
        action: 'show:owner-arm'
        key: y
  - id: owner-bye
    page: /admin
    buttons:
      - text: 'Back (b)'
        action: 'show:owner-ask'
        key: b
      - text: 'Done (d)'
        action: complete
        key: d
  - id: owner-arm
    page: /admin
  - id: settings-highlight
    page: /admin
    attachTo:
      element: 'a[href="#Settings"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: 'show:owner-arm'
        key: b
      - text: 'Go ! (n)'
        action: 'goto:/admin/config?tutorial=onboarding'
        key: n
  # --- /admin/config page steps ---
  - id: config-intro
    page: /admin/config
  - id: config-general
    page: /admin/config
    attachTo:
      element: 'a[href*="/config"].underline'
      on: bottom
  - id: config-secure-intro
    page: /admin/config
  - id: config-site-url
    page: /admin/config
    attachTo:
      element: 'a.body-hyperlink'
      on: bottom
  - id: config-default-url
    page: /admin/config
    attachTo:
      element: 'label:has(input[name="adminHash"]) kbd'
      on: bottom
  - id: config-customize
    page: /admin/config
  - id: config-hash-intro
    page: /admin/config
    attachTo:
      element: 'input[name="adminHash"]'
      on: bottom
  - id: config-hash-type
    page: /admin/config
    attachTo:
      element: 'input[name="adminHash"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: "I'm ready (n)"
        action: next
        key: n
        enableWhen:
          selector: 'input[name="adminHash"]'
          minLength: 5
  - id: config-save
    page: /admin/config
    attachTo:
      element: 'input[type="submit"][value="Update"]'
      on: top
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Save & continue (s)'
        action: 'clickAndStore:input[type="submit"][value="Update"]|adminHashDone'
        key: s
  # --- /admin/config after hash saved ---
  - id: config-done
    page: /admin/config
  - id: recovery-intro
    page: /admin/config
  - id: arm-highlight
    page: /admin/config
    attachTo:
      element: 'a[href$="/arm"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Next (n)'
        action: 'goto:/admin/arm?tutorial=onboarding'
        key: n
  # --- /admin/arm page steps ---
  - id: arm-intro
    page: /admin/arm
    attachTo:
      element: 'h1.text-3xl'
      on: bottom
  - id: arm-roles
    page: /admin/arm
    attachTo:
      element: h2
      on: bottom
  - id: arm-write
    page: /admin/arm
    attachTo:
      element: 'main ul:first-of-type li:first-child span:nth-child(4)'
      on: bottom
  - id: arm-read
    page: /admin/arm
    attachTo:
      element: 'main ul:first-of-type li:first-child span:nth-child(5)'
      on: bottom
  - id: arm-forbidden
    page: /admin/arm
    attachTo:
      element: 'main ul:first-of-type li:first-child span:nth-child(6)'
      on: bottom
  - id: arm-superadmin
    page: /admin/arm
    attachTo:
      element: 'main ul:first-of-type li:nth-child(2) input[name="id"]'
      on: bottom
  - id: arm-superadmin-risk
    page: /admin/arm
  - id: arm-login
    page: /admin/arm
    attachTo:
      element: 'input[name="login"]'
      on: bottom
  - id: arm-alias-intro
    page: /admin/arm
    attachTo:
      element: 'input[name="alias"]'
      on: bottom
  - id: arm-alias-warning
    page: /admin/arm
    attachTo:
      element: 'input[name="alias"]'
      on: bottom
  - id: arm-alias-fill
    page: /admin/arm
    attachTo:
      element: 'input[name="alias"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Next (n)'
        action: next
        key: n
        enableWhen:
          selector: 'input[name="alias"]'
          minLength: 1
  - id: arm-email
    page: /admin/arm
    attachTo:
      element: 'input[name="recoveryEmail"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Next (n)'
        action: next
        key: n
        enableWhen:
          selector: 'input[name="recoveryEmail"]'
          pattern: '.+@.+\..+'
  - id: arm-email-important
    page: /admin/arm
  - id: arm-npub
    page: /admin/arm
    attachTo:
      element: 'input[name="recoveryNpub"]'
      on: bottom
  - id: arm-save
    page: /admin/arm
    attachTo:
      element: 'form:has(input[name="login"]) button[title="Save"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Save (s)'
        action: 'clickAndStore:form:has(input[name="login"]) button[title="Save"]|armUserSaved'
        key: s
  - id: arm-nostr-intro
    page: /admin/arm
    attachTo:
      element: 'a[href="#Node Management"]'
      on: bottom
    buttons:
      - text: 'Next (n)'
        action: 'goto:/admin/nostr?tutorial=onboarding'
        key: n
  # --- /admin/nostr page steps ---
  - id: nostr-welcome
    page: /admin/nostr
    attachTo:
      element: 'h1.text-3xl'
      on: bottom
    buttons:
      - text: 'Next (n)'
        action: 'branch:input[name="privateKey"][disabled]|nostr-already-set|nostr-setup-intro'
        key: n
  - id: nostr-setup-intro
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"]'
      on: top
  - id: nostr-nsec-warning
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"]'
      on: top
  - id: nostr-nsec-safe
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"]'
      on: top
  - id: nostr-has-nsec
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"]'
      on: top
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'No (n)'
        action: 'show:nostr-generate-cta'
        key: n
      - text: 'Yes (y)'
        action: 'show:nostr-fill-nsec'
        key: y
  - id: nostr-fill-nsec
    page: /admin/nostr
    attachTo:
      element: 'input[name="privateKey"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: 'show:nostr-has-nsec'
        key: b
      - text: 'Next (n)'
        action: next
        key: n
        enableWhen:
          selector: 'input[name="privateKey"]'
          pattern: '^nsec1[a-z0-9]{58}$'
  - id: nostr-save-nsec
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"] button.btn-black'
      on: top
    buttons:
      - text: 'No (n)'
        action: back
        key: n
      - text: 'Save (s)'
        action: 'clickAndStore:form[action="?/updatePrivateKey"] button.btn-black|hasSetNsec'
        key: s
  - id: nostr-generate-cta
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updatePrivateKey"] button.btn-gray'
      on: top
    buttons:
      - text: 'Back (b)'
        action: 'show:nostr-has-nsec'
        key: b
      - text: 'Save (s)'
        action: 'clickAndStore:form[action="?/updatePrivateKey"] button.btn-gray|hasSetNsec'
        key: s
  - id: nostr-already-set
    page: /admin/nostr
    attachTo:
      element: 'input[name="privateKey"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: 'show:nostr-welcome'
        key: b
      - text: 'Next (n)'
        action: 'show:nostr-nsec-info'
        key: n
  - id: nostr-nsec-info
    page: /admin/nostr
    attachTo:
      element: 'input[name="privateKey"]'
      on: bottom
  - id: nostr-npub-info
    page: /admin/nostr
    attachTo:
      element: 'main p.break-words'
      on: bottom
  - id: nostr-certify
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/certify"] button'
      on: bottom
  - id: nostr-relays-intro
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updateRelays"] ul'
      on: top
  - id: nostr-relay-input
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updateRelays"] input[type="text"][name="relays"]'
      on: bottom
  - id: nostr-relay-delete
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/updateRelays"] ul li:first-child button'
      on: bottom
  - id: nostr-disable-intro
    page: /admin/nostr
    attachTo:
      element: 'input[name="disableNostrBotIntro"]'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Next (n)'
        action: next
        key: n
        enableWhen:
          selector: 'input[name="disableNostrBotIntro"]'
          checked: true
  - id: nostr-save-settings
    page: /admin/nostr
    attachTo:
      element: 'form[action="?/disableIntro"] button[type="submit"]'
      on: top
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Save (s)'
        action: 'clickAndStore:form[action="?/disableIntro"] button[type="submit"]|unsetNostrIntro'
        key: s
  - id: nostr-to-identity
    page: /admin/nostr
    attachTo:
      element: 'header.navbar a[href="#Settings"]'
      on: bottom
    buttons:
      - text: 'Next (n)'
        action: 'goto:/admin/identity?tutorial=onboarding'
        key: n
  # --- /admin/identity page steps ---
  - id: identity-welcome
    page: /admin/identity
    attachTo:
      element: 'h1.text-3xl'
      on: bottom
    buttons:
      - text: 'Next (n)'
        action: next
        key: n
  - id: identity-business-name
    page: /admin/identity
    attachTo:
      element: 'input[name="businessName"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="businessName"]'
          minLength: 3
  - id: identity-vat
    page: /admin/identity
    attachTo:
      element: 'input[name="vatNumber"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Skip'
        action: next
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="vatNumber"]'
          minLength: 3
  - id: identity-address-intro
    page: /admin/identity
    attachTo:
      element: 'form.contents h2.text-2xl:nth-of-type(2)'
      on: bottom
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Next (n)'
        action: next
        key: n
  - id: identity-street
    page: /admin/identity
    attachTo:
      element: 'input[name="address.street"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Skip'
        action: next
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="address.street"]'
          minLength: 3
  - id: identity-country
    page: /admin/identity
    attachTo:
      element: 'select[name="address.country"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
  - id: identity-state
    page: /admin/identity
    attachTo:
      element: 'input[name="address.state"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Skip'
        action: next
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="address.state"]'
          minLength: 3
  - id: identity-city
    page: /admin/identity
    attachTo:
      element: 'input[name="address.city"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="address.city"]'
          minLength: 3
  - id: identity-zip
    page: /admin/identity
    attachTo:
      element: 'input[name="address.zip"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="address.zip"]'
          minLength: 1
  - id: identity-email
    page: /admin/identity
    attachTo:
      element: 'input[name="contact.email"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="contact.email"]'
          pattern: '.+@.+\..+'
  - id: identity-phone
    page: /admin/identity
    attachTo:
      element: 'input[name="contact.phone"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Skip'
        action: next
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="contact.phone"]'
          pattern: '^[0-9+\- ]{3,}$'
  - id: identity-bank-q
    page: /admin/identity
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'No (n)'
        action: 'show:identity-invoice-q'
        key: n
      - text: 'Yes (y)'
        action: next
        key: y
  - id: identity-bank-holder
    page: /admin/identity
    attachTo:
      element: 'input[name="bank.accountHolder"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: 'show:identity-bank-q'
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="bank.accountHolder"]'
          minLength: 3
  - id: identity-bank-holder-address
    page: /admin/identity
    attachTo:
      element: 'input[name="bank.accountHolderAddress"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="bank.accountHolderAddress"]'
          minLength: 3
  - id: identity-iban
    page: /admin/identity
    attachTo:
      element: 'input[name="bank.iban"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="bank.iban"]'
          minLength: 3
  - id: identity-bic
    page: /admin/identity
    attachTo:
      element: 'input[name="bank.bic"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'input[name="bank.bic"]'
          minLength: 3
  - id: identity-invoice-q
    page: /admin/identity
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'No (n)'
        action: 'show:identity-save'
        key: n
      - text: 'Yes (y)'
        action: next
        key: y
  - id: identity-issuer
    page: /admin/identity
    attachTo:
      element: 'textarea[name="invoice.issuerInfo"]'
      on: bottom
    buttons:
      - text: 'Back'
        action: back
      - text: 'Skip'
        action: 'show:identity-save'
      - text: 'Next'
        action: next
        enableWhen:
          selector: 'textarea[name="invoice.issuerInfo"]'
          minLength: 3
  - id: identity-save
    page: /admin/identity
    attachTo:
      element: 'form.contents button.btn-black[type="submit"]'
      on: top
    buttons:
      - text: 'Back (b)'
        action: back
        key: b
      - text: 'Save (s)'
        action: 'clickAndStore:form.contents button.btn-black[type="submit"]|savedIdentity'
        key: s
  - id: identity-to-currencies
    page: /admin/identity
    attachTo:
      element: 'header.navbar a[href="#Settings"]'
      on: bottom
    buttons:
      - text: 'Next (n)'
        action: 'clickAndStore:header.navbar a[href$="/config"]|hasDoneIdentity'
        key: n
  # --- /admin/config currencies step (reached via hasDoneIdentity) ---
  - id: config-currencies
    page: /admin/config
    attachTo:
      element: 'form[action="?/update"] h2.text-2xl:first-of-type'
      on: bottom
    buttons:
      - text: 'Done (d)'
        action: complete
        key: d
---

## welcome

Welcome to be-BOP back-office! Would you like to begin the tour?

## brand-logo

This is your top bar. You'll be able to change your logo later, add your brand name, and add some links here.

## navbar-intro

This is your navbar. You'll be able to change it later. You can:

## navbar-links

- Add links to your CMS pages or external targets

## navbar-cart

- Access your cart like any customer

## navbar-theme

- Choose your light / dark theme (we'll define it later)

## navbar-language

- Choose your language, if your be-BOP provides more than one

## admin-header

Here, when you're logged as employee / owner, you'll find everything to manage your be-BOP.

## admin-merch

Merch menu to manage your catalog and your CMS.

## admin-settings

Settings menu to make your shop run as intended.

## admin-payment

Payment Settings to set your payment providers and allow your customers to pay.

## admin-transaction

Transaction for order monitoring & reporting.

## admin-node

Node Management to interact with your customers through emails or nostr.

## admin-widgets

Widgets to use be-BOP advanced features, but we'll do that later.

## admin-logout

Log out icon to log out from your employee / owner account. Don't do that yet!

## backoffice-home

This is your back-office welcome page.

## admin-message

A word from your administrator: as the owner, you'll be able to set a message for your team. Are you the owner or an employee?

## employee-end

That's all for now, thanks!

## owner-ask

Is it your first visit here?

## owner-bye

Ok, see you soon!

## owner-arm

The first thing when launching your be-BOP is to protect it. Hover on Settings, then ARM. Hop on!

## settings-highlight

Settings — this is where you'll secure your be-BOP.

## config-intro

Before taking a quick peek on your administrator dashboard, let's securise your back-office URL.

## config-general

This is your general settings dashboard. You'll be able to parameter many things from here.

## config-secure-intro

Let's secure the back-office URL first.

## config-site-url

This is your be-BOP public URL.

## config-default-url

The default back-office URL is this URL then /admin.

## config-customize

Let's customize it to make your back-office more safe.

## config-hash-intro

You can set here a custom URL for your back-office access.

## config-hash-type

Type your custom URL right here. Make it strong, keep it somewhere private and safe, then tell me when you're ready.

## config-save

Great! You can now save your results.

## config-done

You secured your back-office access!

## recovery-intro

Now, let's set your recovery informations for your account.

## arm-highlight

On ARM, we'll manage your account informations.

## arm-intro

This dashboard allows you to create users and roles.

## arm-roles

Roles are employee profiles. You can choose what you want to share with your employees.

## arm-write

You can give full access to a page.

## arm-read

Or read-only access, to forbid any change or update.

## arm-forbidden

Or you can forbid one particular page and allow all the rest.

## arm-superadmin

You are a super-admin. You have every right on your be-BOP. Still...

## arm-superadmin-risk

If your account is lost, nobody would be able to help you. So let's jump to the first user: you.

## arm-login

This is your super-admin login. Keep it somewhere safe and private.

## arm-alias-intro

This is your alias. This is how employees and sometimes customers will see you on your be-BOP.

## arm-alias-warning

Don't use Login as Alias, because it's sensitive information. Alias should be a displayed name, a nickname, a title, but not your login.

## arm-alias-fill

Let's fill your alias!

## arm-email

Enter an email address here. If you lose your password someday, you'll be able to use be-BOP recovery to renew your password.

## arm-email-important

It's important to be able to recover your password.

## arm-npub

You can also fill a npub. It's a Nostr address. Nostr is free and can be launched automatically with be-BOP, without any provider, unlike email.

## arm-save

You can now save your super-admin user profile.

## arm-nostr-intro

Now that's done, let's be sure you'll be able to recover your password from Nostr!

## nostr-welcome

Welcome to Nostr settings!

## nostr-setup-intro

Let's generate your be-BOP nsec.

## nostr-nsec-warning

Nsec is your Nostr private key and acts as both login and password. Never share it with anyone, nor with an application you're unsure about!

## nostr-nsec-safe

Once generated, it should be kept on a safe & private location.

## nostr-has-nsec

Do you already have a Nostr nsec?

## nostr-fill-nsec

Fill your nsec here please.

## nostr-save-nsec

You can now save your nsec.

## nostr-generate-cta

be-BOP will generate your Nostr account.

## nostr-already-set

Your Nostr account is already set!

## nostr-nsec-info

This is your private key. Don't share to anyone nor to untrusty application. It acts as both your login and your password for Nostr.

## nostr-npub-info

This is your npub, your public identity.

## nostr-certify

With this, you'll be able to sync your be-BOP shop with its NostR account. Let's keep that for later once shop informations will be filled.

## nostr-relays-intro

This is your current relay list.

## nostr-relay-input

Here you can set new relays with `wss://yourrelayinformation.address`.

## nostr-relay-delete

Here you can delete a relay if you have connexion issues.

## nostr-disable-intro

Once this option is enabled, anyone messaging your Nostr address will have an automatic answer. Let's keep it disabled for now.

## nostr-save-settings

Save settings.

## nostr-to-identity

Let's now set your shop identity.

## identity-welcome

Here we gonna fill your mandatory shop informations. Those will be used for invoices, among other things.

## identity-business-name

Please fill your official company name.

## identity-vat

Now fill your VAT number. You can skip if your business doesn't have one.

## identity-address-intro

We'll now set your business official address.

## identity-street

Fill the street.

## identity-country

Choose your country.

## identity-state

Fill your country or region if applicable, otherwise, skip.

## identity-city

Fill your city.

## identity-zip

Fill zipcode.

## identity-email

Fill in your business email address. Disclaimer: this email will be displayed as contact in footer if enabled, and will be used to send orders notifications if enabled.

## identity-phone

You can also fill a phone number to be displayed on footer if enabled.

## identity-bank-q

Do you have a professional bank account, and will you accept bank transfers with your be-BOP?

## identity-bank-holder

Fill in your bank account holder name.

## identity-bank-holder-address

Fill in your bank account postal address.

## identity-iban

Please fill your professional bank account IBAN number.

## identity-bic

Please fill in your professional bank BIC.

## identity-invoice-q

Do you address invoices for another company, or in partnership with?

## identity-issuer

Please fill the company name, address and contact if relevant.

## identity-save

Perfect! Let's save everything.

## identity-to-currencies

Next step: let's choose your currencies and VAT behavior 🙂

## config-currencies

be-BOP uses up to 4 different currencies.
