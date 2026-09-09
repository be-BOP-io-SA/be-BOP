# CLINK Configuration

CLINK (Common Lightning Interface for Nostr Keys) is a Lightning payment method that uses the Nostr protocol as a transport layer. It allows merchants to receive Lightning payments via Nostr kind 21001 encrypted events.

## Overview

When a customer pays with CLINK:

1. A **bolt11 invoice** is created immediately at order time and displayed as a QR code
2. Any Lightning wallet can scan and pay the bolt11 directly
3. CLINK-compatible wallets can also scan the merchant's **nOffer** and receive the same bolt11 via Nostr relay
4. Settlement is detected by querying the merchant's configured backend — their be-BOP Lightning processor or their Lightning.Pub node — for the invoice

CLINK is a **transport layer only**, not a Lightning backend. The backend that mints and settles the bolt11 invoices is chosen in **Admin > CLINK**:

- **be-BOP Lightning processor** (default): invoice generation and settlement are delegated to be-BOP's own configured Lightning processor (LND, Blink, PhoenixD, etc.) — the same node that would back any other Lightning payment.
- **Lightning.Pub node**: invoices are minted by your own Lightning.Pub node via its HTTP API (`POST /api/user/invoice/new`), and settlement is queried from that same node (`POST /api/user/payment/state`).

Both options yield a real payment hash and a node-backed `checkPayment()` that reconciles against the backend that actually received the sats.

## Prerequisites

- A **Nostr private key** configured in `.env.local` (nsec format)
- A configured and enabled Lightning processor (e.g., Blink, LND, PhoenixD) — required when the **be-BOP processor** backend is selected
- **OR** a Lightning.Pub **endpoint and token** for your own Lightning.Pub node — required when the **Lightning.Pub** backend is selected
- A Nostr relay for CLINK communication (default: `wss://strfry.shock.network`)

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
# Nostr private key (nsec format) — required for NIP-44 encryption
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin Configuration

Navigate to **Admin > CLINK**:

- **nOffer**: Your Lightning.Pub nOffer string (e.g., `noffer1...`). This identifies your merchant account to CLINK wallets.
- **Nostr relay URL**: The Nostr relay used for CLINK communication (default: `wss://strfry.shock.network`)
- **Lightning backend**: Choose **be-BOP Lightning processor** (LND, Blink, PhoenixD…) or **Lightning.Pub node** — the latter also requires its API endpoint and token below.
- Click **Save**, then **Test connection** to verify the relay and nOffer are working

### 3. Enable CLINK as Payment Method

In the **Config** page, under **Payment Methods**, enable **Lightning** and set the default Lightning processor to **CLINK**. The selected backend must also be configured and enabled: a Lightning processor for the be-BOP processor backend, or your Lightning.Pub endpoint + token for the Lightning.Pub backend.

## How It Works

### Payment Flow

1. **Customer places order** → be-BOP mints a bolt11 (with a real payment hash) on the selected backend — its configured Lightning processor or the Lightning.Pub node
2. **QR code displayed** → The bolt11 invoice QR is shown to the customer
3. **CLINK wallet flow** → CLINK-compatible wallets instead request the invoice over Nostr (kind 21001); the bolt11 is returned encrypted (NIP-44)
4. **Customer pays** → Scans the QR (or uses their CLINK wallet) with any Lightning wallet and pays
5. **Order confirmed** → be-BOP's order poller calls `checkPayment()`, which queries the selected backend for the invoice by its real payment hash (the Lightning.Pub node via `POST /api/user/payment/state`); the order is marked paid

### CLINK Protocol

The CLINK protocol uses Nostr event kind 21001 with NIP-44 encryption:

- **Request** (customer → server): Customer sends an encrypted payment request with the amount
- **Response** (server → customer): Server responds with the encrypted bolt11 invoice
- **Settlement**: Customer pays the bolt11 invoice via standard Lightning; the merchant's Lightning node detects the payment

### Payment Detection

Payment detection is node-backed. `checkPayment()` re-dispatches to the backend recorded per-payment (`meta.backend`):

- **be-BOP processor**: the invoice's backend processor `checkPayment` queries that node for the invoice by payment hash.
- **Lightning.Pub**: the merchant's Lightning.Pub node is queried via `POST /api/user/payment/state` (using the recorded bolt11); it reports the amount actually received and the settle timestamp — never an echo of the expected amount.

There is **no dependency on Nostr receipts** — settlement is verified against the node that actually received the sats, so the flow is stateless and multi-process safe.

A **Check Payment Status** button is available on pending CLINK orders; it only re-runs this node-backed check (settlement is applied by the order poller under the order lock).

### Key Components

- **nOffer**: A bech32-encoded merchant offer string containing the merchant's Nostr public key, relay URL, and offer ID
- **NIP-44 Encryption**: End-to-end encryption for payment requests and responses
- **Invoice creation**: Minted on the selected backend (be-BOP's Lightning processor or the Lightning.Pub node's HTTP API) — a real invoice + payment hash, no Nostr round-trip
- **Persistent Listener**: A long-running Nostr subscription on the merchant's relay that serves bolt11s to CLINK wallets, surviving relay reconnections. The listener starts automatically on server boot.

### Security

- **Relay SSRF Protection**: Relay URLs are validated against private/internal IP ranges before connecting
- **Lightning.Pub Endpoint SSRF Protection**: The Lightning.Pub API endpoint is validated against private/internal IP ranges before every mint and settle call
- **BOLT11 Validation**: Invoices must carry the exact expected amount (no tolerance) and matching network
- **Signature Verification**: All incoming Nostr events are verified before processing
- **Merchant Pubkey Filter**: Nostr subscription filters use the merchant's own public key (derived from `NOSTR_PRIVATE_KEY`), not Lightning.Pub's key

## Supported Wallets

Any Lightning wallet can pay the bolt11 QR code. For the CLINK Nostr flow, use a CLINK-compatible wallet:

- ShockWallet
- ZEUS
- Other CLINK-compatible wallets

## Troubleshooting

### Invoice not created

- Check that the selected backend is configured and enabled: a Lightning processor for the be-BOP processor backend, or Lightning.Pub endpoint + token for the Lightning.Pub backend
- Verify the `NOSTR_PRIVATE_KEY` is set in `.env.local`
- Check the server logs for CLINK-related errors

### QR code not displaying

- Ensure the `assets/bebop-b.svg` file exists for the QR logo overlay
- Check the browser console for errors

### CLINK wallet can't connect

- Verify the relay URL is correct and accessible from the server
- Check that the Nostr relays list in **Admin > Nostr** includes the CLINK relay
- Ensure the nOffer string is valid and matches the configured Nostr key

### Payment not confirmed

- Check that the backend Lightning node is reachable and the invoice was created on it
- Use the **Check Payment Status** button on the order page to manually trigger a node lookup
- The order poller re-checks every 2 seconds; settlement is applied under the order lock

## Technical Details

- **Nostr Event Kind**: 21001
- **Encryption**: NIP-44 (version 2)
- **Invoice backend**: Selectable — be-BOP's Lightning processor (LND, Blink, PhoenixD…) or the merchant's Lightning.Pub node via its HTTP API
- **Payment Detection**: Node-backed lookup by real payment hash — via the invoice's processor, or via `POST /api/user/payment/state` on the Lightning.Pub node
- **CLINK Relay URL**: `wss://strfry.shock.network` (configurable in Admin > CLINK)

## nDebit Settlement

CLINK is a **transport layer only** — it does **not** mandate nDebit for settlement. Payment settlement is handled entirely by the selected backend (be-BOP's Lightning processor or the Lightning.Pub node) via the bolt11 invoice. The merchant receives sats on their existing Lightning backend.

If a merchant wants to use nDebit for same-node settlements (e.g., with ShockWallet), that is configured in their wallet, not in be-BOP.
