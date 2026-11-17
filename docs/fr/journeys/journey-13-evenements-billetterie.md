# Comment organiser des événements et vendre des billets ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la création d'événements, la vente de billets et la validation des entrées avec be-BOP.

## 1. Créer un planning d'événements [A115]

Rendez-vous sur **Admin** > **Widgets** > **Schedule**.

Cliquez sur **Create a new schedule** pour définir un planning.

### Paramètres du planning

- **Nom du planning** : Identifiant du planning (ex. : "Festival 2026", "Ateliers mensuels").
- **Événements** : Ajoutez un ou plusieurs événements au planning. Pour chaque événement, définissez :
  - **Nom de l'événement** : Titre affiché au public.
  - **Date de début** : Date et heure de début de l'événement.
  - **Date de fin** : Date et heure de fin de l'événement.
  - **Description** : Informations complémentaires sur l'événement.

Un même planning peut contenir plusieurs événements (ex. : les différentes dates d'un festival ou les sessions d'un atelier récurrent).

## 2. Créer des billets à partir des événements [A116]

Depuis le planning, vous pouvez générer automatiquement des produits de type billet pour chaque événement.

- Sélectionnez l'événement pour lequel vous souhaitez créer des billets.
- be-BOP génère automatiquement un produit billet lié à l'événement.
- Configurez les paramètres du billet :
  - **Prix** : Définissez le tarif du billet.
  - **Stock** : Limitez le nombre de billets disponibles (capacité de la salle, jauge maximale).
  - **Canaux de vente** : Rendez le billet disponible en ligne et/ou en point de vente.

> Les billets générés sont des produits à part entière. Vous pouvez les personnaliser comme n'importe quel produit (images, descriptions, CMS, etc.).

## 3. Valider les billets (burn/unburn) [A38]

Rendez-vous sur **Admin** > **Ticket** pour accéder à la gestion des billets.

### Scanner et valider un billet (burn)

- Scannez le **QR code** imprimé sur le billet du participant.
- Le système marque le billet comme utilisé (burned) et confirme la validité de l'entrée.
- Si le billet a déjà été utilisé, un message d'avertissement est affiché.

### Annuler la validation (unburn)

- Si un billet a été marqué comme utilisé par erreur, utilisez la fonction **unburn** pour rétablir sa validité.
- Le billet redevient utilisable pour l'entrée.

## 4. Consulter le planning (côté client) [C56]

Les visiteurs de votre boutique peuvent consulter le planning des événements à l'adresse :

```
/schedule/[id]
```

- La page affiche tous les événements du planning avec leurs dates, horaires et descriptions.
- Les visiteurs peuvent voir les événements à venir et accéder directement à l'achat de billets.

## 5. S'inscrire à un événement (RSVP) [C57]

Les clients peuvent confirmer leur participation à un événement à l'adresse :

```
/schedule/[id]/rsvp/[slug]
```

- Le formulaire RSVP permet au client d'indiquer sa présence.
- Cette fonctionnalité est utile pour les événements gratuits ou sur invitation où une inscription préalable est requise.

## 6. Consulter et imprimer les billets [C40]

Après achat, les billets sont accessibles à l'adresse :

```
/order/[id]/tickets
```

- La page affiche tous les billets associés à la commande.
- Chaque billet peut être imprimé ou sauvegardé en PDF.
- Les billets comportent un QR code unique pour la validation à l'entrée.

## 7. Afficher un billet individuel avec QR code [C41]

Chaque billet est accessible individuellement à l'adresse :

```
/ticket/[id]
```

- La page affiche le billet avec toutes les informations de l'événement (nom, date, heure, lieu).
- Le **QR code** est affiché en grand format pour faciliter le scan à l'entrée.
- Le client peut présenter cette page sur son téléphone ou l'imprimer.

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Planning | Créer un planning avec événements | A115 |
| Billets | Générer des billets depuis les événements | A116 |
| Validation | Scanner et valider les billets | A38 |
| Planning public | Consultation par les visiteurs | C56 |
| RSVP | Inscription à un événement | C57 |
| Billets commande | Consulter et imprimer les billets | C40 |
| Billet individuel | Afficher avec QR code | C41 |