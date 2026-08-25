# CLINK-Konfiguration

CLINK (Common Lightning Interface for Nostr Keys) ist eine Lightning-Zahlungsmethode, die das Nostr-Protokoll als Transportschicht nutzt. Sie ermoeglicht es Haendlern, Lightning-Zahlungen ueber verschluesselte Nostr-Events vom Typ 21001 zu empfangen.

## Uebersicht

Wenn ein Kunde mit CLINK bezahlt:

1. Sofort bei Bestellung wird eine **bolt11-Rechnung** erstellt und als QR-Code angezeigt
2. Jedes Lightning-Wallet kann den QR-Code scannen und die bolt11 direkt bezahlen
3. CLINK-kompatible Wallets koennen auch das **nOffer** des Haendlers scannen und dieselbe bolt11 ueber den Nostr-Relay empfangen
4. Die Zahlung wird bestaetigt, wenn Lightning.Pub einen Beleg (zweites kind-21001-Event) an den Haendler sendet

CLINK ist eine Transportschicht, kein Lightning-Backend. Die Rechnungserstellung wird an den konfigurierten Lightning-Prozessor (z.B. Blink) oder einen Lightning.Pub-HTTP-Endpunkt delegiert.

## Voraussetzungen

- Ein **Nostr-Privatschluessel** in `.env.local` (nsec-Format)
- Entweder ein konfigurierter Lightning-Prozessor (z.B. Blink) oder ein Lightning.Pub-HTTP-Endpunkt
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

- **Enable CLINK payments** aktivieren, um CLINK zu aktivieren
- **nOffer**: Ihre Lightning.Pub-nOffer-Zeichenkette (z.B. `noffer1...`). Identifiziert Ihr Haendlerkonto bei CLINK-Wallets.
- **Nostr-Relay-URL**: Der Nostr-Relay fuer die CLINK-Kommunikation (Standard: `wss://strfry.shock.network`)
- **Lightning.Pub-HTTP-Endpunkt** (optional): Wenn Sie eine bestimmte Lightning.Pub-Instanz fuer die Rechnungserstellung verwenden moechten, tragen Sie hier die HTTP-URL ein. Andernfalls wird der konfigurierte Lightning-Prozessor verwendet.
- Auf **Save** klicken, dann **Test connection** um zu pruefen, ob Relay und nOffer funktionieren

### 3. CLINK als Zahlungsmethode aktivieren

Auf der Seite **Config** unter **Zahlungsmethoden** die Option **Lightning** aktivieren und den Standard-Lightning-Prozessor auf **CLINK** setzen.

## Funktionsweise

### Zahlungsablauf

1. **Kunde gibt Bestellung auf** -> be-BOP sendet eine CLINK-Anfrage (kind 21001) an Lightning.Pub ueber den Relay des Haendlers
2. **Lightning.Pub antwortet** -> Gibt eine bolt11-Rechnung fuer den genauen Betrag zurueck
3. **QR-Code wird angezeigt** -> Die bolt11-Rechnung wird dem Kunden praesentiert
4. **Kunde bezahlt** -> Scanned den QR mit jedem Lightning-Wallet und bezahlt
5. **Beleg trifft ein** -> Lightning.Pub sendet ein zweites kind-21001-Event (Zahlungsbeleg) an den Haendler
6. **Bestellung bestaetigt** -> be-BOP empfaengt den Beleg und markiert die Bestellung als bezahlt

### CLINK-Protokoll

Das CLINK-Protokoll verwendet Nostr-Event-Typ 21001 mit NIP-44-Verschluesselung:

- **Anfrage** (Kunde -> Server): Kunde sendet eine verschluesselte Zahlungsanfrage mit dem Betrag
- **Antwort** (Server -> Kunde): Server antwortet mit der verschluesselten bolt11-Rechnung
- **Beleg** (Lightning.Pub -> Server): Nach der Zahlung sendet Lightning.Pub einen Beleg, der die Abwicklung bestaetigt
- **Abwicklung**: Kunde bezahlt die bolt11-Rechnung ueber Standard-Lightning

### Zahlungserkennung

Die Zahlung wird ausschliesslich ueber den **Nostr-Beleg** (zweites kind-21001-Event von Lightning.Pub) erkannt. be-BOP **delegiert die Zahlungserkennung nicht** an den untergeordneten Lightning-Prozessor (Blink, LND usw.), da diese Prozessor Rechnungen, die von Lightning.Pub erstellt wurden, nicht nachschlagen koennen.

Wenn der Beleg nicht empfangen wird (z.B. Relay-Probleme), laeuft die Zahlung nach dem Ablauf der Sitzung (2 Stunden) ab. In der Praxis treffen Belege innerhalb weniger Sekunden nach der Zahlung ein.

Eine Schaltflaeche **Zahlungsstatus pruefen** ist auf ausstehenden CLINK-Bestellungen verfuegbar, mit der Kunden die Zahlungsueberpruefung manuell ausloesen koennen.

### Startup-Replay

Beim Serverstart wird die Relay-Historie wiedergegeben, um Belege abzufangen, waehrend der Serverabwesenheit eingetroffen sind. Es werden Ereignisse seit der Erstellung deraeltesten ausstehenden Sitzung (mit einem 5-Minuten-Puffer) abgefragt, und das Fenster bleibt etwa 30 Sekunden geoeffnet, um verpasste Belege zu erfassen.

### Wichtige Komponenten

- **nOffer**: Eine bech32-kodierte Haendler-Offerten-Zeichenkette mit der Nostr-Oeffentlichkeit des Haendlers, der Relay-URL und der Offer-ID
- **NIP-44-Verschluesselung**: Ende-zu-Ende-Verschluesselung fuer Zahlungsanfragen und -antworten
- **Sitzungsspeicher**: Aktive CLINK-Sitzungen werden in MongoDB mit einem TTL-Index gespeichert und ueberleben Server-Neustarts. Ein In-Memory-Cache sorgt fuer schnelle Lookups.
- **Persistenter Listener**: Eine lang laufende Nostr-Subscription auf dem Relay des Haendlers, die sowohl eingehende Zahlungsanfragen als auch Zahlungsbelege verarbeitet und Relay-Wiederverbindungen ueberlebt. Der Listener startet automatisch beim Serverstart.
- **Doppelte Entschluesselung**: Belege von Lightning.Pub werden mit dem Schluessel von Lightning.Pub als Absender verschluesselt. be-BOP versucht eine doppelte Entschluesselung - zuerst mit dem Event-Autor als Absender (Kunden-Zahlungsanfragen), dann mit dem Schluessel von Lightning.Pub (Belege).

### Sicherheit

- **Relay-SSRF-Schutz**: Relay-URLs werden vor der Verbindung auf private/interne IP-Bereiche geprueft
- **BOLT11-Validierung**: Von Lightning.Pub empfangene Rechnungen werden auf Netzwerkuebereinstimmung und Betragskonsistenz geprueft
- **Signaturverifikation**: Alle eingehenden Nostr-Events werden vor der Verarbeitung verifiziert
- **Haendler-Pubkey-Filter**: Nostr-Subscription-Filter verwenden den oeffentlichen Schluessel des Haendlers (abgeleitet aus `NOSTR_PRIVATE_KEY`), nicht den Schluessel von Lightning.Pub

## Kompatible Wallets

Jedes Lightning-Wallet kann den bolt11-QR-Code bezahlen. Fuer den CLINK-Nostr-Ablauf verwenden Sie ein CLINK-kompatibles Wallet:

- ShockWallet
- ZEUS
- Weitere CLINK-kompatible Wallets

## Fehlerbehebung

### Rechnung nicht erstellt

- Pruefen Sie, ob ein Lightning-Prozessor konfiguriert und aktiviert ist (z.B. Blink), oder ein Lightning.Pub-HTTP-Endpunkt festgelegt ist
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

- Pruefen Sie, ob der Relay vom Server aus erreichbar ist (der SSRF-Schutz kann interne URLs blockieren)
- Ueberpruefen Sie, ob Lightning.Pub Belege an den richtigen Relay sendet
- Verwenden Sie die Schaltflaeche **Zahlungsstatus pruefen** auf der Bestellseite, um die Ueberpruefung manuell auszuloesen
- Die Sitzung laeuft nach 2 Stunden ab - wenn der Beleg laenger dauert, wird die Zahlung nicht bestaetigt
- Beim Serverstart fngt der Startup-Replay-Mechanismus automatisch die letzten verpassten Belege ab

## Technische Details

- **Nostr-Event-Typ**: 21001
- **Verschluesselung**: NIP-44 (Version 2)
- **Zahlungserkennung**: Nostr-Beleg-Callback (zweites kind-21001-Event)
- **Sitzungsspeicherung**: MongoDB mit TTL-Index (2 Stunden)
- **CLINK-Relay-URL**: `wss://strfry.shock.network` (konfigurierbar unter Admin > CLINK)

## nDebit-Abwicklung

CLINK ist **nur eine Transportschicht** - es **fordert kein nDebit** fuer die Abwicklung. Die Zahlungsabwicklung wird vollstaendig vom Standard-Lightning-Prozessor des Haendlers (Blink, LND, Phoenixd usw.) ueber die bolt11-Rechnung abgewickelt. Der Haendler empfaengt die Sats auf seinem bestehenden Lightning-Backend.

Wenn ein Haendler nDebit fuer same-node-Abwicklungen verwenden moechte (z.B. mit ShockWallet), wird dies in seinem Wallet konfiguriert, nicht in be-BOP.
