# Configuration CLINK

CLINK (Common Lightning Interface for Nostr Keys) est un moyen de paiement Lightning qui utilise le protocole Nostr comme couche de transport. Il permet aux marchands de recevoir des paiements Lightning via des événements chiffrés Nostr de type 21001.

## Vue d'ensemble

Lorsqu'un client paie avec CLINK :

1. Une **facture bolt11** est créée immédiatement lors de la commande et affichée sous forme de code QR
2. Tout portefeuille Lightning peut scanner et payer la bolt11 directement
3. Les portefeuilles compatibles CLINK peuvent également scanner le **nOffer** du marchand et recevoir la même bolt11 via le relais Nostr
4. Le paiement est confirmé lorsque Lightning.Pub envoie un reçu (deuxième événement kind 21001) au marchand

CLINK est une couche de transport, pas un backend Lightning. La génération des factures est déléguée au processeur Lightning configuré (ex: Blink) ou à un endpoint HTTP Lightning.Pub.

## Prérequis

- Une **clé privée Nostr** configurée dans `.env.local` (format nsec)
- Soit un processeur Lightning configuré (ex: Blink), soit un endpoint HTTP Lightning.Pub
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

- Activer **Enable CLINK payments** pour activer CLINK
- **nOffer** : Votre chaîne nOffer Lightning.Pub (ex: `noffer1...`). Cela identifie votre compte marchand aux portefeuilles CLINK.
- **URL du relais Nostr** : Le relais Nostr utilisé pour la communication CLINK (par défaut: `wss://strfry.shock.network`)
- **URL de l'endpoint Lightning.Pub** (optionnel) : Si vous souhaitez utiliser une instance Lightning.Pub spécifique pour la génération de factures, entrez son URL HTTP ici. Sinon, le processeur Lightning configuré est utilisé.
- Cliquer sur **Save**, puis **Test connection** pour vérifier que le relais et le nOffer fonctionnent

### 3. Activer CLINK comme moyen de paiement

Dans la page **Config**, sous **Moyens de paiement**, activer **Lightning** et définir le processeur Lightning par défaut sur **CLINK**.

## Fonctionnement

### Flux de paiement

1. **Le client passe commande** → be-BOP envoie une requête CLINK (kind 21001) à Lightning.Pub via le relais du marchand
2. **Lightning.Pub répond** → Retourne une facture bolt11 pour le montant exact
3. **Code QR affiché** → La facture bolt11 est présentée au client
4. **Le client paie** → Scanne le QR avec n'importe quel portefeuille Lightning et paie
5. **Le reçu arrive** → Lightning.Pub envoie un deuxième événement kind 21001 (reçu de paiement) au marchand
6. **Commande confirmée** → be-BOP reçoit le reçu et marque la commande comme payée

### Protocole CLINK

Le protocole CLINK utilise l'événement Nostr de type 21001 avec chiffrement NIP-44 :

- **Requête** (client → serveur) : Le client envoie une demande de paiement chiffrée avec le montant
- **Réponse** (serveur → client) : Le serveur répond avec la facture bolt11 chiffrée
- **Reçu** (Lightning.Pub → serveur) : Après le paiement, Lightning.Pub envoie un reçu confirmant le règlement
- **Règlement** : Le client paie la facture bolt11 via Lightning standard

### Détection du paiement

Le paiement est détecté exclusivement via le **reçu Nostr** (deuxième événement kind 21001 de Lightning.Pub). be-BOP **ne délègue pas** la détection du paiement au processeur Lightning sous-jacent (Blink, LND, etc.) car ces processeurs ne peuvent pas rechercher les factures créées par Lightning.Pub.

Si le reçu n'est pas reçu (ex: problème de relais), le paiement expirera après le délai de session (2 heures). En pratique, les reçus arrivent en quelques secondes après le paiement.

Un bouton **Vérifier le statut du paiement** est disponible sur les commandes CLINK en attente, permettant au client de déclencher manuellement la vérification du paiement.

### Rejeu au démarrage

Au démarrage du serveur, be-BOP rejeu l'historique récent du relais pour récupérer les reçus qui sont arrivés pendant que le serveur était arrêté. Il interroge les événements depuis la création de la session en attente la plus ancienne (avec un tampon de 5 minutes) et reste ouvert pendant environ 30 secondes pour collecter les reçus manqués.

### Composants clés

- **nOffer** : Une chaîne d'offre marchand encodée en bech32 contenant la clé publique Nostr du marchand, l'URL du relais et l'ID de l'offre
- **Chiffrement NIP-44** : Chiffrement de bout en bout pour les requêtes et réponses de paiement
- **Magasin de sessions** : Les sessions CLINK actives sont persistées dans MongoDB avec un index TTL, survivant aux redémarrages du serveur. Un cache en mémoire fournit des recherches rapides.
- **Écouteur persistant** : Une subscription Nostr à long terme sur le relais du marchand qui gère à la fois les demandes de paiement entrantes et les reçus de paiement, survivant aux reconnexions du relais. L'écouteur démarre automatiquement au démarrage du serveur.
- **Double déchiffrement** : Les reçus de Lightning.Pub sont chiffrés avec la clé de Lightning.Pub comme expéditeur. be-BOP tente un double déchiffrement — d'abord en supposant l'auteur de l'événement comme expéditeur (demandes de paiement client), puis en utilisant la clé de Lightning.Pub (reçus).

### Sécurité

- **Protection SSRF des relais** : Les URLs des relais sont validées contre les plages d'IP privées/internes avant la connexion
- **Validation BOLT11** : Les factures reçues de Lightning.Pub sont validées pour la correspondance du réseau et la cohérence du montant
- **Vérification des signatures** : Tous les événements Nostr entrants sont vérifiés avant traitement
- **Filtre par clé publique marchand** : Les filtres d'abonnement Nostr utilisent la propre clé publique du marchand (dérivée de `NOSTR_PRIVATE_KEY`), pas la clé de Lightning.Pub

## Portefeuilles compatibles

Tout portefeuille Lightning peut payer le code QR bolt11. Pour le flux Nostr CLINK, utilisez un portefeuille compatible CLINK :

- ShockWallet
- ZEUS
- Autres portefeuilles compatibles CLINK

## Dépannage

### Facture non créée

- Vérifier qu'un processeur Lightning est configuré et activé (ex: Blink), ou qu'un endpoint HTTP Lightning.Pub est défini
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

- Vérifier que le relais est joignable depuis le serveur (la protection SSRF peut bloquer les URLs internes)
- Vérifier que Lightning.Pub envoie les reçus au bon relais
- Utiliser le bouton **Vérifier le statut du paiement** sur la page de commande pour déclenquer manuellement la vérification
- La session expire après 2 heures — si le reçu est retardé au-delà de ce délai, le paiement ne sera pas confirmé
- Au redémarrage du serveur, le mécanisme de rejeu au démarrage récupérera automatiquement les reçus manqués récents

## Détails techniques

- **Type d'événement Nostr** : 21001
- **Chiffrement** : NIP-44 (version 2)
- **Détection du paiement** : Callback de reçu Nostr (deuxième événement kind 21001)
- **Stockage des sessions** : MongoDB avec index TTL (2 heures)
- **URL du relais CLINK** : `wss://strfry.shock.network` (configurable dans Admin > CLINK)

## Règlement nDebit

CLINK est une **couche de transport uniquement** — il **n'impose pas** nDebit pour le règlement. Le règlement des paiements est entièrement géré par le processeur Lightning par défaut du marchand (Blink, LND, Phoenixd, etc.) via la facture bolt11. Le marchand reçoit les sats sur son backend Lightning existant.

Si un marchand souhaite utiliser nDebit pour les règlements entre nœuds (ex: avec ShockWallet), cela est configuré dans son portefeuille, pas dans be-BOP.
