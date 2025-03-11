# Documentation compte à rebours

Disponible sur **Admin** > **Widgets** > **Countdowns**, cette interface permet de configurer un compte à rebours qui peut être utilisé pour mettre en avant une échéance importante, comme une offre promotionnelle ou un événement spécial.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Ajouter un compte à rebours

Pour ajouter un compte à rebours cliquez sur **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Description** : Identifiant interne unique pour le compte à rebours.

### 2. **Slug**

- **Description** : URL ou clé d'identification unique pour le compte à rebours.
- **Contraintes** :
  - Ne peut contenir que des lettres minuscules, chiffres, tirets.
  - Utile pour générer des liens spécifiques.

### 3. **Title**

- **Description** : Titre visible associé au compte à rebours.
- **Utilisation** : Ce texte peut être affiché sur le site pour contextualiser le compte à rebours.

### 4. **Description**

- **Description** : Texte facultatif décrivant les détails du compte à rebours.
- **Utilisation** : Idéal pour ajouter un contexte ou des instructions concernant l'événement.

### 5. **End At**

- **Description** : Date et heure de fin du compte à rebours.
- **Détails** :
  - Le fuseau horaire est basé sur celui du navigateur de l'utilisateur (affiché en **GMT+0**).
  - Utilisez le calendrier intégré pour sélectionner la date et l'heure de manière intuitive.

## Intégration CMS

Pour intégrer votre compte à rebours dans une zone ou page CMS vous pouvez l'ajoutez comme suit: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

Et votre compte à rebours sera afficher pour vos utilisateurs comme suit.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
