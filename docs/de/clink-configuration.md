# CLINK-Konfiguration

CLINK (Common Lightning Interface for Nostr Keys) ist eine Lightning-Zahlungsmethode, die das Nostr-Protokoll als Transportschicht nutzt. Sie ermoeglicht es Haendlern, Lightning-Zahlungen ueber verschluesselte Nostr-Events vom Typ 21001 zu empfangen.

## Uebersicht

Wenn ein Kunde mit CLINK bezahlt:

1. Sofort bei Bestellung wird eine **bolt11-Rechnung** erstellt und als QR-Code angezeigt
2. Jedes Lightning-Wallet kann den QR-Code scannen und die bolt11 direkt bezahlen
3. CLINK-kompatible Wallets koennen auch das **nOffer** des Haendlers scannen und dieselbe bolt11 ueber den Nostr-Relay empfangen
4. Die Zahlung wird bestaetigt, indem der Lightning-Knoten des konfigurierten Backend-Prozessors nach der Rechnung abgefragt wird (per Zahlungs-Hash)

CLINK ist **nur eine Transportschicht**, kein Lightning-Backend. Die Rechnungserstellung und Abwicklung werden an den konfigurierten Lightning-Prozessor von be-BOP (LND, Blink, PhoenixD usw.) delegiert - denselben Knoten, der auch jedes andere Lightning-Payment tragen wuerde. Das ergibt einen echten Zahlungs-Hash und ein autoritatives, knotengestuetztes `checkPayment()`, das gegen den Backend-Knoten abgleicht, der die Sats tatsaechlich erhalten hat.

## Voraussetzungen

- Ein **Nostr-Privatschluessel** in `.env.local` (nsec-Format)
- Ein konfigurierter und aktivierter Lightning-Prozessor (z.B. Blink, LND, PhoenixD) fuer die Rechnungserstellung
- Ein Nostr-Relay fuer die CLINK-Kommunikation (Standard: `wss://strfry.shock.network`)

## Einrichtung

### 1. Umgebungsvariablen

In `.env.local` hinzufuegen:

```
# Nostr-Privatschluessel (nsec-Format) - erforderlich fuer NIP-44-Verschluesselung
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin-Konfiguration

Zu **Admin > CLINK** navigieren:

- **nOffer**: Ihre Lightning.Pub-nOffer-Zeichenkette (z.B. `noffer1...`). Identifiziert Ihr Haendlerkonto bei CLINK-Wallets.
- **Nostr-Relay-URL**: Der Nostr-Relay fuer die CLINK-Kommunikation (Standard: `wss://strfry.shock.network`)
- Auf **Save** klicken, dann **Test connection** um zu pruefen, ob Relay und nOffer funktionieren

### 3. CLINK als Zahlungsmethode aktivieren

Auf der Seite **Config** unter **Zahlungsmethoden** die Option **Lightning** aktivieren und den Standard-Lightning-Prozessor auf **CLINK** setzen. Das Lightning-Backend (LND, Blink, PhoenixD usw.) muss ebenfalls konfiguriert und aktiviert sein.

## Funktionsweise

### Zahlungsablauf

1. **Kunde gibt Bestellung auf** -> be-BOP delegiert die Rechnungserstellung an seinen konfigurierten Lightning-Prozessor, der eine bolt11 mit echtem Zahlungs-Hash ausstellt
2. **QR-Code wird angezeigt** -> Die bolt11-Rechnung wird dem Kunden praesentiert
3. **CLINK-Wallet-Ablauf** -> CLINK-kompatible Wallets fordern die Rechnung stattdessen ueber Nostr (kind 21001) an; die bolt11 wird verschluesselt (NIP-44) zurueckgegeben
4. **Kunde bezahlt** -> Scanned den QR (oder benutzt sein CLINK-Wallet) mit jedem Lightning-Wallet und bezahlt
5. **Bestellung bestaetigt** -> Der Bestell-Poller von be-BOP ruft `checkPayment()` auf, das an den Lightning-Backend-Prozessor delegiert und den Knoten nach der Rechnung per echtem Zahlungs-Hash abfragt; die Bestellung wird als bezahlt markiert

### CLINK-Protokoll

Das CLINK-Protokoll verwendet Nostr-Event-Typ 21001 mit NIP-44-Verschluesselung:

- **Anfrage** (Kunde -> Server): Kunde sendet eine verschluesselte Zahlungsanfrage mit dem Betrag
- **Antwort** (Server -> Kunde): Server antwortet mit der verschluesselten bolt11-Rechnung
- **Abwicklung**: Kunde bezahlt die bolt11-Rechnung ueber Standard-Lightning; der Lightning-Knoten des Haendlers erkennt die Zahlung

### Zahlungserkennung

Die Zahlung wird vom Lightning-Backend-Prozessor selbst erkannt: `checkPayment()` reicht an den Prozessor weiter, der die Rechnung erstellt hat (pro Zahlung als `meta.backend` gespeichert), und fragt diesen Knoten nach der Rechnung per Zahlungs-Hash ab. Es gibt **keine Abhaengigkeit von Nostr-Belegen** - die Abwicklung wird gegen den Knoten geprueft, der die Sats tatsaechlich erhalten hat, sodass der Ablauf zustandslos und mehrprozesssicher ist.

Eine Schaltflaeche **Zahlungsstatus pruefen** ist auf ausstehenden CLINK-Bestellungen verfuegbar; sie loest nur diese knotengestuetzte Pruefung erneut aus (die Abwicklung erfolgt durch den Bestell-Poller unter der Bestellsperre).

### Wichtige Komponenten

- **nOffer**: Eine bech32-kodierte Haendler-Offerten-Zeichenkette mit der Nostr-Oeffentlichkeit des Haendlers, der Relay-URL und der Offer-ID
- **NIP-44-Verschluesselung**: Ende-zu-Ende-Verschluesselung fuer Zahlungsanfragen und -antworten
- **Rechnungserstellung**: Wird an den konfigurierten Lightning-Prozessor von be-BOP delegiert; erstellt eine echte Rechnung + Zahlungs-Hash ohne Nostr-Roundtrip
- **Persistenter Listener**: Eine lang laufende Nostr-Subscription auf dem Relay des Haendlers, die bolt11-Rechnungen an CLINK-Wallets ausliefert und Relay-Wiederverbindungen ueberlebt. Der Listener startet automatisch beim Serverstart.

### Sicherheit

- **Relay-SSRF-Schutz**: Relay-URLs werden vor der Verbindung auf private/interne IP-Bereiche geprueft
- **BOLT11-Validierung**: Rechnungen muessen exakt den erwarteten Betrag (ohne Toleranz) und das passende Netzwerk tragen
- **Signaturverifikation**: Alle eingehenden Nostr-Events werden vor der Verarbeitung verifiziert
- **Haendler-Pubkey-Filter**: Nostr-Subscription-Filter verwenden den oeffentlichen Schluessel des Haendlers (abgeleitet aus `NOSTR_PRIVATE_KEY`), nicht den Schluessel von Lightning.Pub

## Kompatible Wallets

Jedes Lightning-Wallet kann den bolt11-QR-Code bezahlen. Fuer den CLINK-Nostr-Ablauf verwenden Sie ein CLINK-kompatibles Wallet:

- ShockWallet
- ZEUS
- Weitere CLINK-kompatible Wallets

## Fehlerbehebung

### Rechnung nicht erstellt

- Pruefen Sie, ob ein Lightning-Prozessor konfiguriert und aktiviert ist (z.B. Blink, LND, PhoenixD)
- Ueberpruefen Sie, ob `NOSTR_PRIVATE_KEY` in `.env.local` gesetzt ist
- Pruefen Sie die Server-Logs auf CLINK-bezogene Fehler

### QR-Code wird nicht angezeigt

- Stellen Sie sicher, dass die Datei `assets/bebop-b.svg` fuer das QR-Logo-Overlay vorhanden ist
- Pruefen Sie die Browser-Konsole auf Fehler

### CLINK-Wallet kann sich nicht verbinden

- Ueberpruefen Sie, ob die Relay-URL korrekt und vom Server aus erreichbar ist
- Pruefen Sie, ob die Nostr-Relay-Liste unter **Admin > Nostr** den CLINK-Relay enthaelt
- Stellen Sie sicher, dass die nOffer-Zeichenkette gueltig ist und mit dem konfigurierten Nostr-Schluessel uebereinstimmt

### Zahlung nicht bestaetigt

- Pruefen Sie, ob der Lightning-Backend-Knoten erreichbar ist und die Rechnung darauf erstellt wurde
- Verwenden Sie die Schaltflaeche **Zahlungsstatus pruefen** auf der Bestellseite, um manuell eine Knotenabfrage auszuloesen
- Der Bestell-Poller prueft alle 2 Sekunden erneut; die Abwicklung erfolgt unter der Bestellsperre

## Technische Details

- **Nostr-Event-Typ**: 21001
- **Verschluesselung**: NIP-44 (Version 2)
- **Rechnungs-Backend**: Der konfigurierte Lightning-Prozessor von be-BOP (LND, Blink, PhoenixD usw.)
- **Zahlungserkennung**: Knotengestuetzte Suche per echtem Zahlungs-Hash, delegiert an den Backend-Prozessor der Rechnung
- **CLINK-Relay-URL**: `wss://strfry.shock.network` (konfigurierbar unter Admin > CLINK)

## nDebit-Abwicklung

CLINK ist **nur eine Transportschicht** - es **fordert kein nDebit** fuer die Abwicklung. Die Zahlungsabwicklung wird vollstaendig vom Standard-Lightning-Prozessor des Haendlers (Blink, LND, Phoenixd usw.) ueber die bolt11-Rechnung abgewickelt. Der Haendler empfaengt die Sats auf seinem bestehenden Lightning-Backend.

Wenn ein Haendler nDebit fuer same-node-Abwicklungen verwenden moechte (z.B. mit ShockWallet), wird dies in seinem Wallet konfiguriert, nicht in be-BOP.
