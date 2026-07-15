# E-invoicing (France / Factur-X)

## Introduction

be-BOP can generate a **structured electronic invoice** for every paid payment, in addition to the regular printable receipt. The e-invoice follows the European **EN 16931** semantic standard in its French profile: a **Factur-X** document, i.e. a human-readable **PDF/A-3B** with the machine-readable **CII XML** (`factur-x.xml`) embedded inside.

This prepares be-BOP shops for the French B2B e-invoicing mandate (from September 2026) and lays the groundwork for **e-reporting** (B2C / export transaction data), which will reuse the same infrastructure. The architecture is EU-ready — the country is selectable in the settings — but **only France is available for now**.

E-invoices are generated **asynchronously by a background worker**: confirming a payment never waits on PDF generation, and a generation failure never blocks an order.

## Prerequisites

1. **Seller identity** (`/admin/identity`):
   - Business name, address and **VAT number**
   - The **Legal registration** block: **SIRET** (14 digits — the SIREN is derived from it), legal form (SAS, SARL…), RCS mention and share capital
2. **A fiat currency**: the invoice must be expressed in a fiat currency (EUR for France). The generator picks the first fiat currency among the **accounting → secondary → main** currency roles. A shop configured only in BTC/SAT cannot generate e-invoices — configure an accounting or secondary fiat currency in `/admin/config`.

The settings page shows warnings when any of these are missing.

## Enabling

Go to **Admin → Transaction → E-invoices → Settings** (`/admin/e-invoicing/settings`):

- **Enable e-invoicing** — once enabled, every payment that becomes _paid_ queues an e-invoice
- **Country** — determines the invoice profile (only _France (Factur-X)_ today)
- **Transmission platform** — _None_ for now (see [Transmission](#transmission-pdp) below)

E-invoices are generated for **all paid payments**, B2C included — B2C data is what e-reporting will need later. Orders paid before the feature was enabled are not invoiced retroactively.

## How it works

1. When a payment transitions to **paid**, be-BOP:
   - assigns it a **sequential, gapless invoice number** (allocated atomically inside the payment's database transaction — a French anti-fraud requirement),
   - inserts a _pending_ e-invoice document in the same transaction.
2. The **e-invoice worker** (one instance across the cluster, via a distributed lock) picks it up and:
   - maps the order snapshot to the EN 16931 model (lines, VAT breakdown per rate, document-level discount/delivery-fee allowances and charges, prepaid/due amounts),
   - builds the CII XML and renders the PDF server-side (embedded fonts, PDF/A-3B metadata),
   - packages both as a Factur-X and stores the artifacts: XML on the document, PDF in **S3** when configured (inline in the database otherwise).
3. Failures are retried with exponential back-off (up to 8 attempts); a definitively failed invoice can be retried manually from its admin detail page.

One e-invoice is issued **per paid payment** (matching the existing per-payment invoice number). For an order paid in several installments, each payment gets its own invoice carrying the full order lines plus the _amount already paid_ (BT-113) and _remaining due_ (BT-115).

### Invoice language

The PDF is rendered in the **order's language** — all be-BOP locales are supported (en, fr, de, es-sv, it, nl, pt). The embedded XML is language-neutral by design.

### Payments in another currency (Bitcoin, Lightning…)

The structured XML always stays in the fiat invoice currency (schema requirement). When the actual payment was made in another currency, the invoice shows a dedicated payment block, e.g.:

> Paid with BTC: 0.00123456 BTC (80.25 EUR) — 1 BTC = 65 002.92 EUR (rate at payment time)

Satoshi amounts are displayed as BTC. The same sentence is embedded in the XML as an invoice note (BT-22), so the crypto detail survives in the structured document without breaking validation.

### B2B buyers

At checkout, professional orders capture the **company name** and **VAT number**; with a French billing country, the buyer's **SIREN** is also requested (used in the XML as the buyer's legal registration id, and later for transmission routing). All three appear on the invoice.

## Admin

**Admin → Transaction → E-invoices** (`/admin/e-invoicing`):

- **List** — filterable by invoice number, order number, generation status and transmission status, with direct **PDF / XML downloads**
- **Detail** (click an invoice number) — parties, totals and VAT breakdown, payment info (including the crypto rate when relevant), artifact checksums (SHA-256), the full **status history**, and a **Retry generation** button for failed invoices

Downloads are admin-only. When stored in S3, the PDF is served through a short-lived pre-signed link.

## Transmission (PDP)

The French reform requires B2B invoices to be transmitted through an accredited platform (**Plateforme Agréée** / PDP). be-BOP ships the adapter interface and the transmission status tracking, but **no real platform integration yet** — the only available option is _None_: invoices are generated, numbered and archived locally, ready to be transmitted once a platform adapter exists. Plugging one in requires no data migration.

## Validating conformance

For a formal conformance check of the generated files, use external validators:

- `pdfdetach -list invoice.pdf` (poppler) — shows the embedded `factur-x.xml`
- [veraPDF](https://verapdf.org/) — PDF/A-3B conformance
- The FNFE-MPE / Mustang validators — Factur-X + EN 16931 business rules

## Technical notes

- Collection: `einvoices` (one document per paid payment; queue fields + snapshot of the invoice data + artifacts)
- Modules: `src/lib/server/e-invoice/` (`context.ts` mapper → `cii.ts` XML → `pdf.ts` layout → `facturx.ts` PDF/A-3 packaging → `storage.ts`), worker in `src/lib/server/locks/e-invoice-lock.ts`, PDP adapters in `src/lib/server/e-invoice/platform/`
- Invoice number counter: `runtimeConfig` document `invoiceNumber`, seeded from legacy invoice numbers by migration
- Out of scope for now: e-reporting, receiving supplier invoices, deposit-invoice (« facture d'acompte ») document type, real PDP transmission
