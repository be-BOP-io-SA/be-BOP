# Documentation Contact Form Widget

Accessible sur **Admin** > **Widgets** > **Form**, les widgets form peuvent être utilisés dans votre be-bop pour intégrer des formulaires de contact dans des zones ou pages CMS.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Ajouter un formulaire de contact

Pour ajouter un formulaire de contact cliquez sur **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Informations de Base

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title** : Le nom du formulaire de contact.
- **Slug** : Identifiant unique du formualire de contact.

### Information du formulaire de contact

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target** : Permet au propriétaire de la boutique de définir une adresse email cible ou un npub pour les notifications de contact ; si non renseigné, la valeur par défaut sera l'email de contact de l'identité
- **Display from: field** : Qui, cocher, affiche le champ expéditeur (From:) sur le formulaire de contact. il est accompagné d'un checkbox **Prefill with session information** lorsqu'il est coché préremplie le champ from avec les informations de session.
- **Add a warning to the form with mandatory agreement** : Ajoute une case à cocher obligatoire pour afficher un message d’accord avant l’envoi du formulaire contact.
  - **Disclaimer label** : un titre pour le message d'accord.
  - **Disclaimer Content** : le texte du message d'accord.
  - **Disclaimer checkbox label** : le text du champ à cocher pour le message d'accord.
- **Subject** : Le sujet du formulaire de contact.
- **Content** : Le contenu du formulaire de contact.

Sur les subjects et contents on peut utiliser les balises suivantes dans le texte :

`{{productLink}}` et `{{productName}}` lorsqu’ils sont utilisés sur une page produit.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` and `{{pageName}}` lorsqu’ils sont utilisés partout ailleurs.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## Intégration CMS

Pour intégrer votre formulaire de contact dans une zone ou page CMS vous pouvez l'ajoutez comme suit: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

Et votre formulaire de contact sera afficher pour vos utilisateurs comme suit.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
