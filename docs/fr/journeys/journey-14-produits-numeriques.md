# Comment vendre des produits numériques téléchargeables ?

> **Parcours mixte** — Ce guide couvre la configuration administrateur et l'expérience client.

Ce guide vous accompagne dans la configuration et la vente de produits numériques (e-books, logiciels, fichiers audio, etc.) sur votre boutique be-BOP.

## 1. Configurer un produit comme bien numérique [A14]

Rendez-vous sur **Admin** > **Merch** > **Product**.

Créez un nouveau produit ou éditez un produit existant.

- Cochez l'option **Digital** (ou "Bien numérique") dans les paramètres du produit.
- Un produit marqué comme numérique n'a pas de contrepartie physique : aucune adresse de livraison ne sera demandée au client lors du passage en caisse.

### Paramètres du produit numérique

- **Nom et description** : Décrivez le contenu numérique proposé.
- **Prix** : Définissez le tarif. Vous pouvez aussi utiliser le mode "Pay What You Want" (prix libre) avec un montant minimum.
- **Canaux de vente** : Configurez les canaux sur lesquels le produit est disponible via le canal selector.

## 2. Téléverser des fichiers numériques [A51]

Rendez-vous sur **Admin** > **Merch** > **Files**.

### Ajouter un nouveau fichier

1. Cliquez sur **New file**.
2. Remplissez les champs :
   - **Name of the file** : Nom descriptif du fichier (ex. : "Guide utilisateur PDF", "Album MP3").
   - **File** : Cliquez sur **Parcourir...** pour sélectionner le fichier depuis votre ordinateur.
3. Cliquez sur **Add** pour téléverser le fichier.

### Gérer les fichiers existants

- La liste affiche tous les fichiers téléversés sans produit associé.
- Cliquez sur un fichier pour :
  - **Modifier son nom**.
  - **Copier le lien permanent** : Un lien unique est généré pour chaque fichier (ex. : `/digital-file/raw/[nom]?key=[clé]`).
  - **Télécharger** : Bouton **Download file** pour vérifier le fichier.
  - **Supprimer** : Bouton **Delete** avec confirmation avant suppression définitive.

Pour plus de détails, consultez [Fichiers téléchargeables](../fr/downloadable-files.md).

## 3. Associer des fichiers numériques à un produit [A26]

Depuis la fiche du produit (**Admin** > **Merch** > **Product**) :

- Dans la section des fichiers associés, liez un ou plusieurs fichiers téléversés au produit.
- Les fichiers liés seront accessibles au client uniquement après l'achat et la confirmation du paiement.
- Vous pouvez associer plusieurs fichiers à un même produit (ex. : un e-book en PDF et en EPUB).

> Les fichiers liés à un produit sont protégés : ils ne sont accessibles qu'aux clients ayant une commande validée pour ce produit.

## 4. Télécharger les fichiers (côté client) [C39]

Après achat, le client peut télécharger ses fichiers numériques à l'adresse :

```
/digital-file/raw/[id]
```

### Accès aux fichiers

- Le lien de téléchargement est disponible sur la page de confirmation de commande.
- Si le client a fourni une adresse e-mail ou un npub, le lien est également inclus dans le reçu de commande.
- Le téléchargement nécessite une clé unique associée à la commande du client.

### Cas particulier : fichiers sans produit associé

Les fichiers téléversés sans être liés à un produit disposent d'un lien permanent public. Ces fichiers peuvent être partagés librement via les pages CMS (ex. : documentation, catalogues, brochures).

## Récapitulatif

| Étape | Fonctionnalité | Identifiant |
| ----- | -------------- | ----------- |
| Produit numérique | Cocher l'option Digital | A14 |
| Téléversement | Ajouter des fichiers | A51 |
| Association | Lier fichiers au produit | A26 |
| Téléchargement | Accès client après achat | C39 |