# Facturation électronique (France / Factur-X)

## Introduction

be-BOP peut générer une **facture électronique structurée** pour chaque paiement encaissé, en plus du reçu imprimable habituel. La facture suit la norme sémantique européenne **EN 16931** dans son profil français : un document **Factur-X**, c'est-à-dire un **PDF/A-3B** lisible par l'humain contenant le **XML CII** (`factur-x.xml`) lisible par la machine.

Cette fonctionnalité prépare les boutiques be-BOP à l'obligation française de facturation électronique B2B (à partir de septembre 2026) et pose les fondations du **e-reporting** (données de transactions B2C / export), qui réutilisera la même infrastructure. L'architecture est prête pour l'UE — le pays est sélectionnable dans les réglages — mais **seule la France est disponible pour l'instant**.

Les factures électroniques sont générées **de manière asynchrone par un worker** : la confirmation d'un paiement n'attend jamais la génération du PDF, et un échec de génération ne bloque jamais une commande.

## Prérequis

1. **Identité du vendeur** (`/admin/identity`) :
   - Raison sociale, adresse et **numéro de TVA**
   - Le bloc **Legal registration** : **SIRET** (14 chiffres — le SIREN en est dérivé), forme juridique (SAS, SARL…), mention RCS et capital social
2. **Une devise fiat** : la facture doit être exprimée dans une devise fiat (EUR pour la France). Le générateur choisit la première devise fiat parmi les rôles **accounting → secondary → main**. Une boutique configurée uniquement en BTC/SAT ne peut pas générer de factures électroniques — configurez une devise de comptabilité ou secondaire fiat dans `/admin/config`.

La page de réglages affiche des avertissements lorsqu'un de ces éléments manque.

## Activation

Rendez-vous dans **Admin → Transaction → E-invoices → Settings** (`/admin/e-invoicing/settings`) :

- **Enable e-invoicing** — une fois activé, chaque paiement passant à l'état _payé_ met une facture en file d'attente
- **Country** — détermine le profil de facture (seulement _France (Factur-X)_ aujourd'hui)
- **Transmission platform** — _None_ pour l'instant (voir [Transmission](#transmission-pdp) ci-dessous)

Les factures électroniques sont générées pour **tous les paiements encaissés**, B2C compris — ces données B2C sont celles dont le e-reporting aura besoin plus tard. Les commandes payées avant l'activation ne sont pas facturées rétroactivement.

## Fonctionnement

1. Quand un paiement passe à l'état **payé**, be-BOP :
   - lui attribue un **numéro de facture séquentiel et sans trou** (alloué atomiquement dans la transaction du paiement — exigence anti-fraude française),
   - insère un document de facture _en attente_ dans la même transaction.
2. Le **worker de facturation** (une seule instance dans le cluster, via un verrou distribué) le prend en charge et :
   - projette la commande vers le modèle EN 16931 (lignes, ventilation de TVA par taux, remises et frais de livraison en remises/majorations au niveau document, montants payé/restant dû),
   - construit le XML CII et génère le PDF côté serveur (polices embarquées, métadonnées PDF/A-3B),
   - assemble le tout en Factur-X et stocke les artefacts : XML sur le document, PDF dans **S3** si configuré (sinon dans la base).
3. Les échecs sont retentés avec back-off exponentiel (jusqu'à 8 tentatives) ; une facture définitivement en échec peut être relancée manuellement depuis sa page de détail.

Une facture électronique est émise **par paiement encaissé** (en cohérence avec le numéro de facture par paiement existant). Pour une commande payée en plusieurs fois, chaque paiement reçoit sa propre facture reprenant toutes les lignes de la commande plus le _montant déjà payé_ (BT-113) et le _restant dû_ (BT-115).

### Langue de la facture

Le PDF est rendu dans la **langue de la commande** — toutes les locales be-BOP sont supportées (en, fr, de, es-sv, it, nl, pt). Le XML embarqué est indépendant de la langue par conception.

### Paiements dans une autre devise (Bitcoin, Lightning…)

Le XML structuré reste toujours dans la devise fiat de la facture (exigence du schéma). Quand le paiement réel a été effectué dans une autre devise, la facture affiche un bloc de paiement dédié, par exemple :

> Payé en BTC : 0.00123456 BTC (80.25 EUR) — 1 BTC = 65 002.92 EUR (taux au moment du paiement)

Les montants en satoshis sont affichés en BTC. La même phrase est intégrée au XML comme note de facture (BT-22) : le détail crypto survit dans le document structuré sans casser la validation.

### Acheteurs B2B

Au checkout, les commandes professionnelles capturent la **raison sociale** et le **numéro de TVA** ; avec un pays de facturation français, le **SIREN** de l'acheteur est également demandé (utilisé dans le XML comme identifiant légal de l'acheteur, et plus tard pour le routage de la transmission). Les trois figurent sur la facture.

## Administration

**Admin → Transaction → E-invoices** (`/admin/e-invoicing`) :

- **Liste** — filtrable par numéro de facture, numéro de commande, statut de génération et statut de transmission, avec **téléchargements PDF / XML** directs
- **Détail** (cliquer sur un numéro de facture) — parties, totaux et ventilation de TVA, informations de paiement (dont le taux crypto le cas échéant), empreintes des artefacts (SHA-256), **historique des statuts** complet, et un bouton **Retry generation** pour les factures en échec

Les téléchargements sont réservés aux administrateurs. Quand le PDF est stocké dans S3, il est servi via un lien pré-signé à courte durée de vie.

## Transmission (PDP)

La réforme française impose la transmission des factures B2B via une **Plateforme Agréée** (PDP). be-BOP fournit l'interface d'adaptateur et le suivi du statut de transmission, mais **aucune intégration réelle de plateforme pour l'instant** — la seule option disponible est _None_ : les factures sont générées, numérotées et archivées localement, prêtes à être transmises dès qu'un adaptateur de plateforme existera. En brancher un ne nécessite aucune migration de données.

## Valider la conformité

Pour un contrôle formel de conformité des fichiers générés, utilisez des validateurs externes :

- `pdfdetach -list facture.pdf` (poppler) — affiche le `factur-x.xml` embarqué
- [veraPDF](https://verapdf.org/) — conformité PDF/A-3B
- Les validateurs FNFE-MPE / Mustang — règles métier Factur-X + EN 16931

## Notes techniques

- Collection : `einvoices` (un document par paiement encaissé ; champs de file d'attente + instantané des données de facture + artefacts)
- Modules : `src/lib/server/e-invoice/` (`context.ts` mapper → `cii.ts` XML → `pdf.ts` mise en page → `facturx.ts` empaquetage PDF/A-3 → `storage.ts`), worker dans `src/lib/server/locks/e-invoice-lock.ts`, adaptateurs PDP dans `src/lib/server/e-invoice/platform/`
- Compteur de numéros de facture : document `runtimeConfig` `invoiceNumber`, initialisé depuis les numéros de facture existants par migration
- Hors périmètre pour l'instant : e-reporting, réception des factures fournisseurs, facture d'acompte comme type de document distinct, transmission PDP réelle
