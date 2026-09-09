# Configuration CLINK

CLINK (Common Lightning Interface for Nostr Keys) est un moyen de paiement Lightning qui utilise le protocole Nostr comme couche de transport. Il permet aux marchands de recevoir des paiements Lightning via des événements chiffrés Nostr de type 21001.

## Vue d'ensemble

Lorsqu'un client paie avec CLINK :

1. Une **facture bolt11** est créée immédiatement lors de la commande et affichée sous forme de code QR
2. Tout portefeuille Lightning peut scanner et payer la bolt11 directement
3. Les portefeuilles compatibles CLINK peuvent également scanner le **nOffer** du marchand et recevoir la même bolt11 via le relais Nostr
4. Le paiement est confirmé en interrogeant le backend configuré du marchand — son processeur Lightning be-BOP ou son nœud Lightning.Pub — pour la facture

CLINK est une **couche de transport uniquement**, pas un backend Lightning. Le backend qui émet et règle les factures bolt11 est choisi dans **Admin > CLINK** :

- **Processeur Lightning be-BOP** (par défaut) : la génération des factures et le règlement sont délégués au processeur Lightning configuré de be-BOP (LND, Blink, PhoenixD, etc.) — le même nœud qui prendrait en charge tout autre paiement Lightning.
- **Nœud Lightning.Pub** : les factures sont émises par votre propre nœud Lightning.Pub via son API HTTP (`POST /api/user/invoice/new`), et le règlement est vérifié auprès de ce même nœud (`POST /api/user/payment/state`).

Les deux options donnent un hash de paiement réel et un `checkPayment()` fiable appuyé sur le nœud, qui vérifie auprès du backend qui a réellement reçu les sats.

## Prérequis

- Une **clé privée Nostr** configurée dans `.env.local` (format nsec)
- Un processeur Lightning configuré et activé (ex: Blink, LND, PhoenixD) — requis lorsque le backend **processeur be-BOP** est sélectionné
- **OU** un **endpoint et un jeton** Lightning.Pub pour votre propre nœud Lightning.Pub — requis lorsque le backend **Lightning.Pub** est sélectionné
- Un relais Nostr pour la communication CLINK (par défaut: `wss://strfry.shock.network`)

## Configuration

### 1. Variables d'environnement

Ajouter dans `.env.local` :

```env
# Clé privée Nostr (format nsec) — nécessaire pour le chiffrement NIP-44
NOSTR_PRIVATE_KEY="nsec1..."
```

### 2. Configuration Admin

Naviguer vers **Admin > CLINK** :

- **nOffer** : Votre chaîne nOffer Lightning.Pub (ex: `noffer1...`). Cela identifie votre compte marchand aux portefeuilles CLINK.
- **URL du relais Nostr** : Le relais Nostr utilisé pour la communication CLINK (par défaut: `wss://strfry.shock.network`)
- **Backend Lightning** : Choisir **Processeur Lightning be-BOP** (LND, Blink, PhoenixD…) ou **Nœud Lightning.Pub** — ce dernier nécessite également son endpoint API et son jeton ci-dessous.
- Cliquer sur **Save**, puis **Test connection** pour vérifier que le relais et le nOffer fonctionnent

### 3. Activer CLINK comme moyen de paiement

Dans la page **Config**, sous **Moyens de paiement**, activer **Lightning** et définir le processeur Lightning par défaut sur **CLINK**. Le backend sélectionné doit également être configuré et activé : un processeur Lightning pour le backend processeur be-BOP, ou votre endpoint + jeton Lightning.Pub pour le backend Lightning.Pub.

## Fonctionnement

### Flux de paiement

1. **Le client passe commande** → be-BOP émet une bolt11 (avec un vrai hash de paiement) sur le backend sélectionné — son processeur Lightning configuré ou le nœud Lightning.Pub
2. **Code QR affiché** → La facture bolt11 est présentée au client
3. **Flux portefeuille CLINK** → Les portefeuilles compatibles CLINK demandent plutôt la facture via Nostr (kind 21001) ; la bolt11 est renvoyée chiffrée (NIP-44)
4. **Le client paie** → Scanne le QR (ou utilise son portefeuille CLINK) avec n'importe quel portefeuille Lightning et paie
5. **Commande confirmée** → Le poller de commandes de be-BOP appelle `checkPayment()`, qui interroge le backend sélectionné pour la facture par son vrai hash de paiement (le nœud Lightning.Pub via `POST /api/user/payment/state`) ; la commande est marquée payée

### Protocole CLINK

Le protocole CLINK utilise l'événement Nostr de type 21001 avec chiffrement NIP-44 :

- **Requête** (client → serveur) : Le client envoie une demande de paiement chiffrée avec le montant
- **Réponse** (serveur → client) : Le serveur répond avec la facture bolt11 chiffrée
- **Règlement** : Le client paie la facture bolt11 via Lightning standard ; le nœud Lightning du marchand détecte le paiement

### Détection du paiement

La détection du paiement est appuyée sur le nœud. `checkPayment()` redirige vers le backend enregistré par paiement (`meta.backend`) :

- **Processeur be-BOP** : `checkPayment` du processeur backend interroge ce nœud pour la facture par hash de paiement.
- **Lightning.Pub** : le nœud Lightning.Pub du marchand est interrogé via `POST /api/user/payment/state` (en utilisant la bolt11 enregistrée) ; il signale le montant réellement reçu et l'horodatage de règlement — jamais un écho du montant attendu.

Il n'y a **aucune dépendance aux reçus Nostr** — le règlement est vérifié auprès du nœud qui a réellement reçu les sats, le flux est donc sans état et sûr en multi-processus.

Un bouton **Vérifier le statut du paiement** est disponible sur les commandes CLINK en attente ; il relance uniquement ce contrôle appuyé sur le nœud (le règlement est appliqué par le poller de commandes sous le verrou de commande).

### Composants clés

- **nOffer** : Une chaîne d'offre marchand encodée en bech32 contenant la clé publique Nostr du marchand, l'URL du relais et l'ID de l'offre
- **Chiffrement NIP-44** : Chiffrement de bout en bout pour les requêtes et réponses de paiement
- **Création de facture** : Émise sur le backend sélectionné (processeur Lightning de be-BOP ou API HTTP du nœud Lightning.Pub) — une vraie facture + hash de paiement, sans aller-retour Nostr
- **Écouteur persistant** : Une subscription Nostr à long terme sur le relais du marchand qui fournit les bolt11 aux portefeuilles CLINK, survivant aux reconnexions du relais. L'écouteur démarre automatiquement au démarrage du serveur.

### Sécurité

- **Protection SSRF des relais** : Les URLs des relais sont validées contre les plages d'IP privées/internes avant la connexion
- **Protection SSRF de l'endpoint Lightning.Pub** : L'endpoint API Lightning.Pub est validé contre les plages d'IP privées/internes avant chaque appel de mint et de règlement
- **Validation BOLT11** : Les factures doivent porter exactement le montant attendu (sans tolérance) et le réseau correspondant
- **Vérification des signatures** : Tous les événements Nostr entrants sont vérifiés avant traitement
- **Filtre par clé publique marchand** : Les filtres d'abonnement Nostr utilisent la propre clé publique du marchand (dérivée de `NOSTR_PRIVATE_KEY`), pas la clé de Lightning.Pub

## Portefeuilles compatibles

Tout portefeuille Lightning peut payer le code QR bolt11. Pour le flux Nostr CLINK, utilisez un portefeuille compatible CLINK :

- ShockWallet
- ZEUS
- Autres portefeuilles compatibles CLINK

## Dépannage

### Facture non créée

- Vérifier que le backend sélectionné est configuré et activé : un processeur Lightning pour le backend processeur be-BOP, ou un endpoint + jeton Lightning.Pub pour le backend Lightning.Pub
- Vérifier que `NOSTR_PRIVATE_KEY` est défini dans `.env.local`
- Consulter les logs du serveur pour les erreurs liées à CLINK

### Code QR non affiché

- S'assurer que le fichier `assets/bebop-b.svg` existe pour le logo superposé au QR
- Vérifier la console du navigateur pour les erreurs

### Le portefeuille CLINK ne peut pas se connecter

- Vérifier que l'URL du relais est correcte et accessible depuis le serveur
- Vérifier que la liste des relais Nostr dans **Admin > Nostr** inclut le relais CLINK
- S'assurer que la chaîne nOffer est valide et correspond à la clé Nostr configurée

### Paiement non confirmé

- Vérifier que le nœud Lightning backend est joignable et que la facture a été créée dessus
- Utiliser le bouton **Vérifier le statut du paiement** sur la page de commande pour déclencher manuellement une recherche sur le nœud
- Le poller de commandes revérifie toutes les 2 secondes ; le règlement est appliqué sous le verrou de commande

## Détails techniques

- **Type d'événement Nostr** : 21001
- **Chiffrement** : NIP-44 (version 2)
- **Backend de facture** : Sélectionnable — processeur Lightning de be-BOP (LND, Blink, PhoenixD…) ou nœud Lightning.Pub du marchand via son API HTTP
- **Détection du paiement** : Recherche appuyée sur le nœud par vrai hash de paiement — via le processeur de la facture, ou via `POST /api/user/payment/state` sur le nœud Lightning.Pub
- **URL du relais CLINK** : `wss://strfry.shock.network` (configurable dans Admin > CLINK)

## Règlement nDebit

CLINK est une **couche de transport uniquement** — il **n'impose pas** nDebit pour le règlement. Le règlement des paiements est entièrement géré par le backend sélectionné (processeur Lightning de be-BOP ou nœud Lightning.Pub) via la facture bolt11. Le marchand reçoit les sats sur son backend Lightning existant.

Si un marchand souhaite utiliser nDebit pour les règlements entre nœuds (ex: avec ShockWallet), cela est configuré dans son portefeuille, pas dans be-BOP.
