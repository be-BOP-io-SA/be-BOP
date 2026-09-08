# CLINK Configuration

CLINK (Common Lightning Interface for Nostr Keys) is a Lightning payment method that uses the Nostr protocol as a transport layer. It allows merchants to receive Lightning payments via Nostr kind 21001 encrypted events.

## Overview

When a customer pays with CLINK:

1. A **bolt11 invoice** is created immediately at order time and displayed as a QR code
2. Any Lightning wallet can scan and pay the bolt11 directly
3. CLINK-compatible wallets can also scan the merchant's **nOffer** and receive the same bolt11 via Nostr relay
4. Settlement is detected by querying the Lightning node of the merchant's configured backend processor for the invoice (by payment hash)

CLINK is a **transport layer only**, not a Lightning backend. Invoice generation and settlement are delegated to be-BOP's own configured Lightning processor (LND, Blink, PhoenixD, etc.) — the same node that would back any other Lightning payment. This yields a real payment hash and an authoritative, node-backed `checkPayment()` that reconciles against the backend that actually received the sats.

## Prerequisites

- A **Nostr private key** configured in `.env.local` (nsec format)
- A configured and enabled Lightning processor (e.g., Blink, LND, PhoenixD) used for invoice generation
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
- Click **Save**, then **Test connection** to verify the relay and nOffer are working

### 3. Enable CLINK as Payment Method

In the **Config** page, under **Payment Methods**, enable **Lightning** and set the default Lightning processor to **CLINK**. The underlying Lightning backend (LND, Blink, PhoenixD…) must also be configured and enabled.

## How It Works

### Payment Flow

1. **Customer places order** → be-BOP delegates invoice creation to its configured Lightning processor, which mints a bolt11 with a real payment hash
2. **QR code displayed** → The bolt11 invoice QR is shown to the customer
3. **CLINK wallet flow** → CLINK-compatible wallets instead request the invoice over Nostr (kind 21001); the bolt11 is returned encrypted (NIP-44)
4. **Customer pays** → Scans the QR (or uses their CLINK wallet) with any Lightning wallet and pays
5. **Order confirmed** → be-BOP's order poller calls `checkPayment()`, which delegates to the backend Lightning processor and queries the node for the invoice by its real payment hash; the order is marked paid

### CLINK Protocol

The CLINK protocol uses Nostr event kind 21001 with NIP-44 encryption:

- **Request** (customer → server): Customer sends an encrypted payment request with the amount
- **Response** (server → customer): Server responds with the encrypted bolt11 invoice
- **Settlement**: Customer pays the bolt11 invoice via standard Lightning; the merchant's Lightning node detects the payment

### Payment Detection

Payment is detected by the backend Lightning processor itself: `checkPayment()` re-dispatches to the processor that created the invoice (recorded per-payment as `meta.backend`) and queries that node for the invoice by payment hash. There is **no dependency on Nostr receipts** — settlement is verified against the node that actually received the sats, so the flow is stateless and multi-process safe.

A **Check Payment Status** button is available on pending CLINK orders; it only re-runs this node-backed check (settlement is applied by the order poller under the order lock).

### Key Components

- **nOffer**: A bech32-encoded merchant offer string containing the merchant's Nostr public key, relay URL, and offer ID
- **NIP-44 Encryption**: End-to-end encryption for payment requests and responses
- **Invoice creation**: Delegated to be-BOP's configured Lightning processor; creates a real invoice + payment hash, no Nostr round-trip
- **Persistent Listener**: A long-running Nostr subscription on the merchant's relay that serves bolt11s to CLINK wallets, surviving relay reconnections. The listener starts automatically on server boot.

### Security

- **Relay SSRF Protection**: Relay URLs are validated against private/internal IP ranges before connecting
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

- Check that a Lightning processor is configured and enabled (e.g., Blink, LND, PhoenixD)
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
- **Invoice backend**: be-BOP's configured Lightning processor (LND, Blink, PhoenixD…)
- **Payment Detection**: Node-backed lookup by real payment hash, delegated to the invoice's backend processor
- **CLINK Relay URL**: `wss://strfry.shock.network` (configurable in Admin > CLINK)

## nDebit Settlement

CLINK is a **transport layer only** — it does **not** mandate nDebit for settlement. Payment settlement is handled entirely by the merchant's default lightning processor (Blink, LND, Phoenixd, etc.) via the bolt11 invoice. The merchant receives sats on their existing lightning backend.

If a merchant wants to use nDebit for same-node settlements (e.g., with ShockWallet), that is configured in their wallet, not in be-BOP.
