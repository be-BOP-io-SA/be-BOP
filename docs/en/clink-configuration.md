# CLINK Configuration

CLINK (Common Lightning Interface for Nostr Keys) is a Lightning payment method that uses the Nostr protocol as a transport layer. It allows merchants to receive Lightning payments via Nostr kind 21001 encrypted events.

## Overview

When a customer pays with CLINK:

1. A **bolt11 invoice** is created immediately at order time and displayed as a QR code
2. Any Lightning wallet can scan and pay the bolt11 directly
3. CLINK-compatible wallets can also scan the merchant's **nOffer** and receive the same bolt11 via Nostr relay
4. Payment is confirmed when Lightning.Pub sends a receipt (second kind 21001 event) to the merchant

CLINK is a transport layer, not a Lightning backend. Invoice generation delegates to the configured Lightning processor (e.g., Blink) or a Lightning.Pub HTTP endpoint.

## Prerequisites

- A **Nostr private key** configured in `.env.local` (nsec format)
- Either a configured Lightning processor (e.g., Blink) or a Lightning.Pub HTTP endpoint
- A Nostr relay for CLINK communication (e.g., `wss://strfry.shock.network`)

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
# Nostr private key (nsec format) — required for NIP-44 encryption
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin Configuration

Navigate to **Admin > Config** and scroll to the **CLINK** section:

- **nOffer**: Your Lightning.Pub nOffer string (e.g., `noffer1...`). This identifies your merchant account to CLINK wallets.
- **Relay**: The Nostr relay URL used for CLINK communication (e.g., `wss://strfry.shock.network`)
- **Lightning.Pub HTTP Endpoint** (optional): If you want to use a specific Lightning.Pub instance for invoice generation, enter its HTTP URL here. Otherwise, the configured Lightning processor is used.

### 3. Enable CLINK as Payment Method

In the **Config** page, under **Payment Methods**, enable **Lightning** and set the default Lightning processor to **CLINK**.

## How It Works

### Payment Flow

1. **Customer places order** → be-BOP sends a CLINK request (kind 21001) to Lightning.Pub via the merchant's relay
2. **Lightning.Pub responds** → Returns a bolt11 invoice for the exact amount
3. **QR code displayed** → The bolt11 invoice QR is shown to the customer
4. **Customer pays** → Scans the QR with any Lightning wallet and pays
5. **Receipt arrives** → Lightning.Pub sends a second kind 21001 event (payment receipt) to the merchant
6. **Order confirmed** → be-BOP receives the receipt and marks the order as paid

### CLINK Protocol

The CLINK protocol uses Nostr event kind 21001 with NIP-44 encryption:

- **Request** (customer → server): Customer sends an encrypted payment request with the amount
- **Response** (server → customer): Server responds with the encrypted bolt11 invoice
- **Receipt** (Lightning.Pub → server): After payment, Lightning.Pub sends a receipt event confirming settlement
- **Settlement**: Customer pays the bolt11 invoice via standard Lightning

### Payment Detection

Payment is detected exclusively via the **Nostr receipt** (second kind 21001 event from Lightning.Pub). be-BOP does NOT delegate payment detection to the underlying Lightning processor (Blink, LND, etc.) because those processors cannot look up invoices created by Lightning.Pub.

If the receipt is not received (e.g., relay issues), the payment will expire after the session timeout (2 hours). In practice, receipts arrive within seconds of payment.

### Key Components

- **nOffer**: A bech32-encoded merchant offer string containing the merchant's Nostr public key, relay URL, and offer ID
- **NIP-44 Encryption**: End-to-end encryption for payment requests and responses
- **Session Store**: Active CLINK sessions are persisted in MongoDB with a TTL index, surviving server restarts. An in-memory cache provides fast lookups.
- **Persistent Listener**: A long-running Nostr subscription on the merchant's relay that handles both incoming payment requests and payment receipts, surviving relay reconnections

### Security

- **Relay SSRF Protection**: Relay URLs are validated against private/internal IP ranges before connecting
- **BOLT11 Validation**: Invoices received from Lightning.Pub are validated for network match and amount consistency
- **Signature Verification**: All incoming Nostr events are verified before processing

## Supported Wallets

Any Lightning wallet can pay the bolt11 QR code. For the CLINK Nostr flow, use a CLINK-compatible wallet:

- ShockWallet
- ZEUS
- Other CLINK-compatible wallets

## Troubleshooting

### Invoice not created

- Check that a Lightning processor is configured and enabled (e.g., Blink), or a Lightning.Pub HTTP endpoint is set
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

- Check that the relay is reachable from the server (SSRF protection may block internal URLs)
- Verify Lightning.Pub is sending receipts to the correct relay
- The session expires after 2 hours — if the receipt is delayed beyond that, the payment will not be confirmed

## Technical Details

- **Nostr Event Kind**: 21001
- **Encryption**: NIP-44 (version 2)
- **Payment Detection**: Nostr receipt callback (second kind 21001 event)
- **Session Storage**: MongoDB with TTL index (2 hours)
- **Default Relays**: `wss://strfry.shock.network`, `wss://relay.shocknet.app`

## nDebit Settlement

CLINK is a **transport layer only** — it does **not** mandate nDebit for settlement. Payment settlement is handled entirely by the merchant's default lightning processor (Blink, LND, Phoenixd, etc.) via the bolt11 invoice. The merchant receives sats on their existing lightning backend.

If a merchant wants to use nDebit for same-node settlements (e.g., with ShockWallet), that is configured in their wallet, not in be-BOP.
