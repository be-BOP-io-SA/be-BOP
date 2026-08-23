# CLINK-Konfiguration

CLINK (Common Lightning Interface for Nostr Keys) ist eine Lightning-Zahlungsmethode, die das Nostr-Protokoll als Transportschicht nutzt. Sie ermöglicht es Händlern, Lightning-Zahlungen über verschlüsselte Nostr-Events vom Typ 21001 zu empfangen.

## Übersicht

Wenn ein Kunde mit CLINK bezahlt:

1. Sofort bei Bestellung wird eine **bolt11-Rechnung** erstellt und als QR-Code angezeigt
2. Jedes Lightning-Wallet kann den QR-Code scannen und die bolt11 direkt bezahlen
3. CLINK-kompatible Wallets können auch das **nOffer** des Händlers scannen und dieselbe bolt11 über den Nostr-Relay empfangen
4. Die Zahlung wird bestätigt, wenn Lightning.Pub einen Beleg (zweites kind-21001-Event) an den Händler sendet

CLINK ist eine Transportschicht, kein Lightning-Backend. Die Rechnungserstellung wird an den konfigurierten Lightning-Prozessor (z.B. Blink) oder einen Lightning.Pub-HTTP-Endpunkt delegiert.

## Voraussetzungen

- Ein **Nostr-Privatschlüssel** in `.env.local` (nsec-Format)
- Entweder ein konfigurierter Lightning-Prozessor (z.B. Blink) oder ein Lightning.Pub-HTTP-Endpunkt
- Ein Nostr-Relay für die CLINK-Kommunikation (z.B. `wss://strfry.shock.network`)

## Einrichtung

### 1. Umgebungsvariablen

In `.env.local` hinzufügen:

```env
# Nostr-Privatschlüssel (nsec-Format) — erforderlich für NIP-44-Verschlüsselung
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Admin-Konfiguration

Zu **Admin > Config** navigieren und zum Bereich **CLINK** scrollen:

- **nOffer**: Ihre Lightning.Pub-nOffer-Zeichenkette (z.B. `noffer1...`). Identifiziert Ihr Händlerkonto bei CLINK-Wallets.
- **Relay**: Die Nostr-Relay-URL für die CLINK-Kommunikation (z.B. `wss://strfry.shock.network`)
- **Lightning.Pub-HTTP-Endpunkt** (optional): Wenn Sie eine bestimmte Lightning.Pub-Instanz für die Rechnungserstellung verwenden möchten, tragen Sie hier die HTTP-URL ein. Andernfalls wird der konfigurierte Lightning-Prozessor verwendet.

### 3. CLINK als Zahlungsmethode aktivieren

Auf der Seite **Config** unter **Zahlungsmethoden** die Option **Lightning** aktivieren und den Standard-Lightning-Prozessor auf **CLINK** setzen.

## Funktionsweise

### Zahlungsablauf

1. **Kunde gibt Bestellung auf** → be-BOP sendet eine CLINK-Anfrage (kind 21001) an Lightning.Pub über den Relay des Händlers
2. **Lightning.Pub antwortet** → Gibt eine bolt11-Rechnung für den genauen Betrag zurück
3. **QR-Code wird angezeigt** → Die bolt11-Rechnung wird dem Kunden präsentiert
4. **Kunde bezahlt** → Scanned den QR mit jedem Lightning-Wallet und bezahlt
5. **Beleg trifft ein** → Lightning.Pub sendet ein zweites kind-21001-Event (Zahlungsbeleg) an den Händler
6. **Bestellung bestätigt** → be-BOP empfängt den Beleg und markiert die Bestellung als bezahlt

### CLINK-Protokoll

Das CLINK-Protokoll verwendet Nostr-Event-Typ 21001 mit NIP-44-Verschlüsselung:

- **Anfrage** (Kunde → Server): Kunde sendet eine verschlüsselte Zahlungsanfrage mit dem Betrag
- **Antwort** (Server → Kunde): Server antwortet mit der verschlüsselten bolt11-Rechnung
- **Beleg** (Lightning.Pub → Server): Nach der Zahlung sendet Lightning.Pub einen Beleg, der die Abwicklung bestätigt
- **Abwicklung**: Kunde bezahlt die bolt11-Rechnung über Standard-Lightning

### Zahlungserkennung

Die Zahlung wird ausschließlich über den **Nostr-Beleg** (zweites kind-21001-Event von Lightning.Pub) erkannt. be-BOP **delegiert die Zahlungserkennung nicht** an den untergeordneten Lightning-Prozessor (Blink, LND usw.), da diese Prozessor Rechnungen, die von Lightning.Pub erstellt wurden, nicht nachschlagen können.

Wenn der Beleg nicht empfangen wird (z.B. Relay-Probleme), läuft die Zahlung nach dem Ablauf der Sitzung (2 Stunden) ab. In der Praxis treffen Belege innerhalb weniger Sekunden nach der Zahlung ein.

### Wichtige Komponenten

- **nOffer**: Eine bech32-kodierte Händler-Offerten-Zeichenkette mit der Nostr-Öffentlichkeit des Händlers, der Relay-URL und der Offer-ID
- **NIP-44-Verschlüsselung**: Ende-zu-Ende-Verschlüsselung für Zahlungsanfragen und -antworten
- **Sitzungsspeicher**: Aktive CLINK-Sitzungen werden in MongoDB mit einem TTL-Index gespeichert und überleben Server-Neustarts. Ein In-Memory-Cache sorgt für schnelle Lookups.
- **Persistenter Listener**: Eine lang laufende Nostr-Subscription auf dem Relay des Händlers, die sowohl eingehende Zahlungsanfragen als auch Zahlungsbelege verarbeitet und Relay-Wiederverbindungen überlebt

### Sicherheit

- **Relay-SSRF-Schutz**: Relay-URLs werden vor der Verbindung auf private/interne IP-Bereiche geprüft
- **BOLT11-Validierung**: Von Lightning.Pub empfangene Rechnungen werden auf Netzwerkübereinstimmung und Betragskonsistenz geprüft
- **Signaturverifikation**: Alle eingehenden Nostr-Events werden vor der Verarbeitung verifiziert

## Kompatible Wallets

Jedes Lightning-Wallet kann den bolt11-QR-Code bezahlen. Für den CLINK-Nostr-Ablauf verwenden Sie ein CLINK-kompatibles Wallet:

- ShockWallet
- ZEUS
- Weitere CLINK-kompatible Wallets

## Fehlerbehebung

### Rechnung nicht erstellt

- Prüfen Sie, ob ein Lightning-Prozessor konfiguriert und aktiviert ist (z.B. Blink), oder ein Lightning.Pub-HTTP-Endpunkt festgelegt ist
- Überprüfen Sie, ob `NOSTR_PRIVATE_KEY` in `.env.local` gesetzt ist
- Prüfen Sie die Server-Logs auf CLINK-bezogene Fehler

### QR-Code wird nicht angezeigt

- Stellen Sie sicher, dass die Datei `assets/bebop-b.svg` für das QR-Logo-Overlay vorhanden ist
- Prüfen Sie die Browser-Konsole auf Fehler

### CLINK-Wallet kann sich nicht verbinden

- Überprüfen Sie, ob die Relay-URL korrekt und vom Server aus erreichbar ist
- Prüfen Sie, ob die Nostr-Relay-Liste unter **Admin > Nostr** den CLINK-Relay enthält
- Stellen Sie sicher, dass die nOffer-Zeichenkette gültig ist und mit dem konfigurierten Nostr-Schlüssel übereinstimmt

### Zahlung nicht bestätigt

- Prüfen Sie, ob der Relay vom Server aus erreichbar ist (der SSRF-Schutz kann interne URLs blockieren)
- Überprüfen Sie, ob Lightning.Pub Belege an den richtigen Relay sendet
- Die Sitzung läuft nach 2 Stunden ab — wenn der Beleg länger dauert, wird die Zahlung nicht bestätigt

## Technische Details

- **Nostr-Event-Typ**: 21001
- **Verschlüsselung**: NIP-44 (Version 2)
- **Zahlungserkennung**: Nostr-Beleg-Callback (zweites kind-21001-Event)
- **Sitzungsspeicherung**: MongoDB mit TTL-Index (2 Stunden)
- **Standard-Relays**: `wss://strfry.shock.network`, `wss://relay.shocknet.app`

## nDebit-Abwicklung

CLINK ist **nur eine Transportschicht** — es **fordert kein nDebit** für die Abwicklung. Die Zahlungsabwicklung wird vollständig vom Standard-Lightning-Prozessor des Händlers (Blink, LND, Phoenixd usw.) über die bolt11-Rechnung abgewickelt. Der Händler empfängt die Sats auf seinem bestehenden Lightning-Backend.

Wenn ein Händler nDebit für same-node-Abwicklungen verwenden möchte (z.B. mit ShockWallet), wird dies in seinem Wallet konfiguriert, nicht in be-BOP.
