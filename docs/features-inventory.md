# be-BOP Feature Inventory

## Customer Features

| # | Feature | Route/Location |
|---|---------|---------------|
| C01 | Browse home page (CMS-designed) | `/` |
| C02 | Browse product catalog | `/catalog` |
| C03 | View product details (name, description, images, price) | `/product/[id]` |
| C04 | Zoom/browse product pictures | `/product/[id]` |
| C05 | Select product variation/option | `/product/[id]` |
| C06 | Select product quantity | `/product/[id]` |
| C07 | Pay-what-you-wish pricing | `/product/[id]` |
| C08 | Book time slot (date, duration, time) | `/product/[id]` |
| C09 | Choose deposit vs full payment | `/product/[id]` |
| C10 | Accept age restriction disclaimer | `/product/[id]` |
| C11 | Buy now (direct checkout) | `/product/[id]` → `?/buy` |
| C12 | Add to cart | `/product/[id]` → `?/addToCart` |
| C13 | View cart with VAT breakdown per item | `/cart` |
| C14 | Increase/decrease item quantity in cart | `/cart` |
| C15 | Remove item from cart | `/cart` |
| C16 | View delivery fees in cart | `/cart` |
| C17 | View partial price vs total with deposit | `/cart` |
| C18 | Add product by alias (staff) | `/cart` |
| C19 | Fill shipping address | `/checkout` |
| C20 | Fill billing address (if different) | `/checkout` |
| C21 | Enter company/professional info | `/checkout` |
| C22 | Select payment method | `/checkout` |
| C23 | Pay with credit card (Stripe) | `/checkout` |
| C24 | Pay with PayPal | `/checkout` |
| C25 | Pay with SumUp | `/checkout` |
| C26 | Pay with Bitcoin on-chain | `/checkout` |
| C27 | Pay with Lightning Network | `/checkout` |
| C28 | Pay with bank transfer | `/checkout` |
| C29 | Pay at POS (in-person) | `/checkout` |
| C30 | Split payment across methods (POS) | `/checkout` |
| C31 | Opt-in to newsletter | `/checkout` |
| C32 | Accept terms of service | `/checkout` |
| C33 | Accept VAT customs declaration (foreign delivery) | `/checkout` |
| C34 | View order list | `/orders` |
| C35 | View order details & status | `/order/[id]` |
| C36 | View/download invoice/receipt | `/order/[id]/payment/[paymentId]/receipt` |
| C37 | View payment QR code | `/order/[id]/payment/[paymentId]/qrcode` |
| C38 | Pay pending order | `/order/[id]/payment/[paymentId]/pay` |
| C39 | Download digital product files | `/digital-file/raw/[id]` |
| C40 | View/print event tickets | `/order/[id]/tickets` |
| C41 | View single ticket with QR code | `/ticket/[id]` |
| C42 | Add notes to order | `/order/[id]/notes` |
| C43 | Login via email magic link | `/login` |
| C44 | Login via Nostr npub | `/login` |
| C45 | Login via OAuth (Google, Facebook, Twitter, GitHub, custom) | `/login/oauth/[slug]` |
| C46 | Manage session (clear email, npub, SSO) | `/login` |
| C47 | Update personal info (name, address) | `/identity` |
| C48 | Manage newsletter preferences | `/identity` |
| C49 | View subscription details | `/subscription/[id]` |
| C50 | Renew subscription | `/subscription/[id]` → `?/renew` |
| C51 | Browse products by tag/category | `/tag/[id]` |
| C52 | View CMS custom pages | `/[slug]` |
| C53 | View challenge/loyalty program progress | `/challenges/[id]` |
| C54 | View leaderboard | `/leaderboards/[id]` |
| C55 | Browse image gallery | `/gallery/[id]` |
| C56 | View event schedule | `/schedule/[id]` |
| C57 | RSVP to event | `/schedule/[id]/rsvp/[slug]` |
| C58 | Subscribe to schedule notifications | `/schedule/[id]/subscribe` |
| C59 | View countdown timer | `/countdown/[id]` |
| C60 | Submit contact/custom form | `/form/[id]` |
| C61 | Receive email notifications (order status) | Email system |
| C62 | Receive Nostr notifications (order status) | Nostr system |
| C63 | View exchange rates | `/exchange-rate` |
| C64 | Nostr-based shopping (add/remove from cart via DM) | Nostr handler |
| C65 | Nostr-based order creation | Nostr handler |
| C66 | Benefit from subscription discounts | Cart/Checkout |
| C67 | Benefit from time-limited discounts | Cart/Checkout |

## Admin Features

| # | Feature | Route/Location |
|---|---------|---------------|
| A01 | Create product | `/admin/product` |
| A02 | Edit product details (name, description, type) | `/admin/product/[id]` |
| A03 | Set product pricing | `/admin/product/[id]` |
| A04 | Bulk update product prices | `/admin/product/[id]/prices` |
| A05 | Manage product stock (total, available, reserved) | `/admin/product/[id]` |
| A06 | Link product stock to another product (stock reference) | `/admin/product/[id]` |
| A07 | Create product variations with individual prices | `/admin/product/[id]` |
| A08 | Manage product pictures (upload, order, delete) | `/admin/product/[id]` |
| A09 | Set default product picture | `/admin/product/[id]/default-picture` |
| A10 | Manage product aliases | `/admin/product/[id]/alias` |
| A11 | Assign tags to product | `/admin/product/[id]/tags` |
| A12 | Assign VAT profile to product | `/admin/product/[id]` |
| A13 | Restrict payment methods per product | `/admin/product/[id]` |
| A14 | Configure product as digital good | `/admin/product/[id]` |
| A15 | Configure product as subscription | `/admin/product/[id]` |
| A16 | Configure product as donation | `/admin/product/[id]` |
| A17 | Set product as pay-what-you-want | `/admin/product/[id]` |
| A18 | Set maximum price cap | `/admin/product/[id]` |
| A19 | Configure deposit/partial payment | `/admin/product/[id]` |
| A20 | Set product availability dates (preorder) | `/admin/product/[id]` |
| A21 | Configure product booking settings | `/admin/product/[id]` |
| A22 | Add product CTAs (call-to-action links) | `/admin/product/[id]` |
| A23 | Set product channel visibility (eShop, Retail, Google Shopping, Nostr) | `/admin/product/[id]` |
| A24 | Hide product from SEO | `/admin/product/[id]` |
| A25 | Add sell disclaimer | `/admin/product/[id]` |
| A26 | Attach digital files to product | `/admin/product/[id]` |
| A27 | Configure product delivery settings | `/admin/product/[id]` |
| A28 | Manage product translations | `/admin/product/[id]/translations` |
| A29 | Add content before/after product (CMS zones) | `/admin/product/[id]` |
| A30 | Mobile-specific product display settings | `/admin/product/[id]` |
| A31 | View all orders with filtering | `/admin/order` |
| A32 | View order details | `/admin/order/[id]` |
| A33 | Cancel order (refund stock) | `/admin/order/[id]` |
| A34 | Add manual payment to pending order | `/admin/order/[id]` |
| A35 | Add order notes | `/admin/order/[id]` |
| A36 | Forward order receipt via email/Nostr | `/admin/order/[id]` |
| A37 | Assign labels to orders | `/admin/order/[id]/label` |
| A38 | Burn/unburn event tickets | `/admin/ticket` |
| A39 | Upload and manage pictures | `/admin/picture` |
| A40 | Bulk picture naming | `/admin/picture` |
| A41 | Create/edit CMS pages | `/admin/cms/[slug]` |
| A42 | CMS page translations | `/admin/cms/[slug]` |
| A43 | CMS page SEO metadata | `/admin/cms/[slug]` |
| A44 | Create discounts (percentage or free products) | `/admin/discount` |
| A45 | Assign discounts to subscriptions | `/admin/discount/[id]` |
| A46 | Set discount validity period (start/end dates) | `/admin/discount/[id]` |
| A47 | Link discounts to specific products or entire catalog | `/admin/discount/[id]` |
| A48 | Create/edit themes (fonts, colors, dark/light mode) | `/admin/theme` |
| A49 | Set active theme | `/admin/theme` |
| A50 | Create product/order labels (color, icon) | `/admin/label` |
| A51 | Upload digital files | `/admin/digital-file` |
| A52 | Manage SEO settings | `/admin/seo` |
| A53 | Toggle maintenance mode + IP whitelist | `/admin/config` |
| A54 | Configure subscription duration & reminders | `/admin/config` |
| A55 | Set payment timeout | `/admin/config` |
| A56 | Set stock reservation time | `/admin/config` |
| A57 | Configure currencies (main, secondary, accounting, reference) | `/admin/config` |
| A58 | Configure VAT regime (exemption, seller country, buyer country) | `/admin/config` |
| A59 | Create custom VAT rates per country | `/admin/config/vat` |
| A60 | Set VAT exemption reason (invoice text) | `/admin/config` |
| A61 | Make VAT=0% for foreign deliveries | `/admin/config` |
| A62 | Configure delivery fees (flat/per-item, by country) | `/admin/config/delivery` |
| A63 | Allow free delivery for POS | `/admin/config/delivery` |
| A64 | Configure checkout button visibility | `/admin/config` |
| A65 | Require billing address | `/admin/config` |
| A66 | Enable newsletter opt-in | `/admin/config` |
| A67 | Set cart max items | `/admin/config` |
| A68 | Set physical cart minimum amount | `/admin/config` |
| A69 | Send order email copy to admin | `/admin/config` |
| A70 | Configure language selector | `/admin/config` |
| A71 | Set default location | `/admin/config` |
| A72 | Configure contact modes | `/admin/config` |
| A73 | Inject analytics script | `/admin/config` |
| A74 | Set admin hash/password | `/admin/config` |
| A75 | Order payment methods | `/admin/config` |
| A76 | Set Bitcoin confirmation thresholds | `/admin/config/confirmation-threshold` |
| A77 | Enable/disable languages | `/admin/language` |
| A78 | Set default language | `/admin/language` |
| A79 | Custom translation keys (JSON) | `/admin/language` |
| A80 | Create admin users | `/admin/arm/user/new` |
| A81 | Create roles with granular permissions (read/write/forbidden) | `/admin/arm/role/new` |
| A82 | Assign roles to users | `/admin/arm/user/[id]` |
| A83 | Set recovery email/npub for admin users | `/admin/arm/user/[id]` |
| A84 | Disable/enable admin users | `/admin/arm/user/[id]` |
| A85 | Configure seller identity (business info, branding) | `/admin/identity` |
| A86 | Configure physical shop (location, hours) | `/admin/physical-shop` |
| A87 | Configure email templates (subject, HTML body) | `/admin/template` |
| A88 | Reset email template to default | `/admin/template` |
| A89 | Configure POS settings | `/admin/pos` |
| A90 | Enable age restriction with legal text | `/admin/age-restriction` |
| A91 | Add OAuth providers (client ID, secret, issuer) | `/admin/oauth` |
| A92 | Configure S3 storage (bucket, credentials) | `/admin/s3` |
| A93 | Configure Stripe (API keys, currency) | `/admin/stripe` |
| A94 | Configure PayPal (client ID, secret, sandbox mode) | `/admin/paypal` |
| A95 | Configure SumUp (API key, merchant code, currency) | `/admin/sumup` |
| A96 | Configure BTCPay Server (API key, store ID, URL) | `/admin/btcpay-server` |
| A97 | Configure PhoenixD (node connection) | `/admin/phoenixd` |
| A98 | Configure Swiss Bitcoin Pay | `/admin/swiss-bitcoin-pay` |
| A99 | Configure Bitcoin Nodeless | `/admin/bitcoin-nodeless` |
| A100 | Configure bitcoind (RPC connection) | `/admin/bitcoind` |
| A101 | Configure LND (Lightning node) | `/admin/lnd` |
| A102 | Configure POS payment methods | `/admin/pos-payments` |
| A103 | Configure SMTP (server, credentials) | `/admin/smtp` |
| A104 | Send test emails | `/admin/email` |
| A105 | Configure Nostr (relay, publishing) | `/admin/nostr` |
| A106 | View sales reports & analytics | `/admin/reporting` |
| A107 | Create database backup (full or products-only) | `/admin/backup/create` |
| A108 | Import database backup | `/admin/backup/import` |
| A109 | Create tags (name, slug, family, title, CTAs) | `/admin/tags` |
| A110 | Create image sliders | `/admin/slider` |
| A111 | Create product specifications | `/admin/specification` |
| A112 | Create contact forms | `/admin/form` |
| A113 | Create countdown timers | `/admin/countdown` |
| A114 | Create image galleries | `/admin/gallery` |
| A115 | Create event schedules with events | `/admin/schedule` |
| A116 | Create tickets from events (auto-generate products) | `/admin/schedule/[id]/event/[slug]` |
| A117 | Create challenges (goal, timeline, products) | `/admin/challenge` |
| A118 | Create leaderboards | `/admin/leaderboard` |
| A119 | Manage page layout | `/admin/layout` |
| A120 | Open/close POS session | `/pos` |
| A121 | POS touch screen: browse/search products | `/pos/touch` |
| A122 | POS touch screen: create order tabs | `/pos/touch` |
| A123 | POS touch screen: add items, edit quantity, add notes | `/pos/touch` |
| A124 | POS touch screen: split order across tabs | `/pos/touch/tab/[slug]/split` |
| A125 | POS touch screen: proceed to payment | `/pos/touch` |
| A126 | POS touch screen: print kitchen ticket | `/pos/touch/tab/[slug]/kitchen-ticket` |
| A127 | Generate X ticket (intra-day report) | `/pos/x-ticket` |
| A128 | Generate Z ticket (end-of-day report) | `/pos/closing` |
| A129 | View POS session history | `/pos/history` |
| A130 | Forbid POS touch when session closed | `/admin/config` |

## System/Backend Features

| # | Feature |
|---|---------|
| S01 | Multi-provider payment processing (9 providers) |
| S02 | Payment status monitoring (background polling) |
| S03 | Bitcoin confirmation block tracking |
| S04 | Exchange rate fetching (Coinbase API) |
| S05 | Email queue with SMTP sending |
| S06 | Nostr notification queue + relay pool |
| S07 | Nostr DM processing (shopping via Nostr) |
| S08 | Nostr zap receipts (NIP-57) |
| S09 | Subscription reminder/expiration notifications |
| S10 | Stock reservation with timeout |
| S11 | Stock availability auto-refresh |
| S12 | Abandoned cart cleanup |
| S13 | Pending file cleanup |
| S14 | IP-to-country geolocation (IP2Location) |
| S15 | Rate limiting (per IP) |
| S16 | Database migrations system |
| S17 | MongoDB change streams (real-time events) |
| S18 | S3 cloud storage (pictures, digital files) |
| S19 | Image resizing & format conversion (Sharp) |
| S20 | Password hashing (bcrypt) + pwned check |
| S21 | OAuth integration (OIDC) |
| S22 | Admin hash protection |
| S23 | Role-based access control (ARM) |
| S24 | Invoice number generation |
| S25 | Order/subscription sequential numbering |
| S26 | Telemetry beacon (Nostr-based, opt-in) |
| S27 | DOMPurify XSS protection |
| S28 | Multi-language i18n with fallbacks |
| S29 | Theme validation (Zod schemas) |
| S30 | External product fetching (cross-instance) |
| S31 | Well-known endpoints (Nostr NIP-05, LNURL-pay) |
| S32 | Delivery fee calculation engine |
| S33 | VAT calculation engine (multi-country, multi-profile) |
