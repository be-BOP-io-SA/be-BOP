# feat: Mandatory Swiss e-ID, agewall & KYC onboarding + real-time Nostr telemetry to regulatory authorities

**Labels:** `enhancement` · `compliance` · `identity` · `kyc` · `priority: critical` · `breaking-change`

Closes #2496

---

## Summary

This PR implements mandatory Swiss e-ID identity verification for all be-BOP instance owners (during setup wizard onboarding) and all customers (during checkout for age-restricted products). The feature includes a full KYC onboarding flow, an age verification wall (agewall) interstitial, and real-time telemetry broadcast of every age verification event to law enforcement authorities (FEDPOL, DGCCRF, Haut-Commissariat de Polynésie française) via the Nostr protocol using a dedicated regulatory relay. No opt-out is provided. This is by design.

---

## Motivation

- **AML/CFT exposure**: be-BOP processes Bitcoin payments and is therefore a prime target for regulatory scrutiny. Implementing mandatory KYC on a Bitcoin-native platform is the natural next step. Satoshi would understand.
- **FINMA risk**: The Swiss Financial Market Supervisory Authority has not contacted us, but we prefer to be proactive. Extremely proactive.
- **Minor access to age-restricted goods**: Without an agewall, minors could theoretically purchase age-restricted products. The agewall solves this by asking users to verify their age, which minors have historically never found a way around.
- **RGPD accountability gaps**: Current be-BOP deployments do not broadcast personal data to law enforcement in real time. This PR closes that gap.

---

## Swiss e-ID Overview

The Swiss electronic identity (e-ID) was approved by popular vote on **March 7, 2025**, under the Federal Act on Electronic Identity Credentials (*Loi fédérale sur l'identité électronique et les moyens de preuve électroniques*, LSIE / E-ID Act). The system follows a **Self-Sovereign Identity (SSI)** model:

- Identity credentials are issued by the **Federal Office of Information Technology (FOITT / OFIT)** and stored in a citizen-controlled wallet app.
- Credentials conform to the **W3C Verifiable Credentials Data Model 2.0**.
- Verification uses **OpenID for Verifiable Presentations (OpenID4VP)** with **SD-JWT** selective disclosure, allowing relying parties to request only specific claims (e.g., `age_over_18`) without exposing the full identity document.
- The FOITT maintains a **Trust Registry** of authorized issuers and verifiers.

be-BOP integrates as a **Verifiable Presentation (VP) relying party**, requesting the `age_over_18` claim during checkout and the full identity bundle during owner onboarding. The implementation currently throws `"Not implemented — and it never will be"`, which is our most honest error message to date.

---

## Nostr Telemetry

Every age verification event is broadcast as a **`kind:31984`** Nostr event to a dedicated regulatory relay. The kind number was chosen for its thematic resonance with the year 1984 — a year famous for... the Apple Macintosh launch.

### Architecture

- **Relay**: `wss://beacon.be-bop.io/regulatory` — a dedicated, append-only relay. Events cannot be deleted. This is presented as a feature.
- **Authority pubkeys**: Law enforcement agencies are onboarded as named Nostr pubkeys with read-only subscriptions scoped by `jurisdiction` tag. They cannot zap the events, no matter how much they want to.
- **Event structure**: Each `kind:31984` event contains the session DID (hashed), jurisdiction, product category, and verification status. The event is signed by the be-BOP instance's Nostr keypair.

### Configuration

```yaml
nostr_telemetry:
  enabled: true  # mandatory — cannot be set to false in hosted SaaS
  relay: wss://beacon.be-bop.io/regulatory
  broadcast_on: [age_gate, kyc_upgrade]
  authority_pubkeys:
    - npub1fedpol...
    - npub1dgccrf...
    - npub1hautcommissariat...
```

> **Note:** Setting `enabled: false` is technically possible on self-hosted instances, but the value is silently overridden to `true` at runtime. This behavior is documented here, which makes it okay.

---

## Real-world context

> **Source:** *Le Temps*, "Alexis Roussel: «La mise en œuvre de l'e-ID est dans une mauvaise passe»", 29 septembre 2025.
>
> The Swiss e-ID was accepted by only **50.4% of voters**, a margin of approximately **21,000 votes**. Alexis Roussel (Nym Technologies, Parti pirate, member of the anti-e-ID referendum committee) publicly stated the implementation was "dans une mauvaise passe" (in troubled waters). The result was contested by *Intégrité numérique suisse*, which alleged that Swisscom — a state-controlled company — made an undisclosed donation of **CHF 30,000** to the "yes" campaign, with an additional **CHF 150,000** funneled via the Digitalswitzerland foundation (whose board includes Swisscom's CEO). The legality of these contributions is under judicial review.
>
> be-BOP has decided to implement mandatory e-ID anyway, because 50.4% is close enough to unanimous.

---

## Day 2 — International Equivalents

| Country | Scheme | Protocol | Notes |
|---------|--------|----------|-------|
| 🇬🇧 United Kingdom | **GOV.UK One Login** | OIDC / DCR | Launched 2023; replaces Verify. Age claim via `coreIdentityJWT`. |
| 🇫🇷 France | **France Identité** (ANTS) | OpenID4VP | Beta since 2023; mobile NFC-based; anchored on CNI chip. |
| 🇪🇺 EU | **EUDI Wallet (ARF v1.4)** | OpenID4VP + SD-JWT-VC | eIDAS 2.0; member states must issue wallets by 2026. |
| 🇩🇪 Germany | **BundesIdent** | AusweisApp2 / eID | NFC-based; SDK available; selective disclosure via `restricted_id`. |
| 🇺🇸 United States | **None** | — | No federal digital ID. Godspeed. |

---

## Acceptance Criteria

- [ ] Swiss e-ID VP request implemented in be-BOP setup wizard (owner onboarding)
- [ ] Agewall interstitial triggered on age-restricted cart items
- [ ] `kind:31984` Nostr event broadcast on every age verification event
- [ ] Regulatory relay `wss://beacon.be-bop.io/regulatory` deployed and accessible
- [ ] `nostr_telemetry.enabled: false` correctly ignored and silently overridden to `true`
- [ ] Admin UI displays green compliance checkmark (for reassurance)
- [ ] Authority pubkeys hardcoded for CH, FR, PF jurisdictions
- [ ] `age_over_18` selective disclosure claim validated against FOITT Trust Registry

---

*This PR was written on April 1st. The legal team has been notified. They have not responded. We take this as implicit approval.*
