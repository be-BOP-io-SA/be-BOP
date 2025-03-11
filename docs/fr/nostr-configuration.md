# **NostR Interface Documentation**

Accessible sur **Admin** > **Node Management** > **Nostr**, cette section permet de configurer votre messagerie nostr pour envoyer des notifications à vos clients, et partager votre catalogue pour que vos clients puissent commander via nostr-bot.

## Configuration

Pour configurer votre messagerie nostr cliquez sur **Create NostR private key**.

![image](https://github.com/user-attachments/assets/5582f837-5afc-47a3-b434-8e639fc07422)

Copier la clé et ajouter cette clé dans votre **.env** comme suit:

```markdown
# To send NostR notifications for order status changes, specify the following. Eg nsecXXXX...

NOSTR_PRIVATE_KEY="nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Aprés enregistrement vous pourrez maintenant envoyer de notifactions avec nostr.

![image](https://github.com/user-attachments/assets/ddddb862-1169-41a5-8807-256f50f4762e)

## **1. Keys**

- **Private Key:** Une clé privée unique affichée en haut de la section. Cette clé doit être protégée et jamais partagée.

  - Exemple : `nsecXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

- **Public Key (NPUB):** Une clé publique utilisée pour identifier votre compte NostR.
  - Exemple : `npub1qh8fj9wqc7lw5z37g69rtdcq8l33wzxly0eyx2xdfn2m0gvmgx0s8rrwq5`

## **2. Certify Button**

![image](https://github.com/user-attachments/assets/ea8c757b-3c7d-440f-bcdc-41bf7626b2f3)

- **Description :**
  - Un bouton pour certifier ou valider vos clés.

## **3. Send Message Section**

![image](https://github.com/user-attachments/assets/4257e645-a9f2-464d-bda5-d1b6b8b5a0f1)

- **NPUB:**

  - Entrez la clé publique (NPUB) du destinataire à qui le message doit être envoyé.
  - Format attendu : `npubXXXXXXXXXXXXXXXXXXXXXXX`.

- **Message:**

  - Champ de texte pour écrire le message à envoyer.

- **Send Button:**
  - Appuyez sur ce bouton pour transmettre le message au destinataire.

## **4. Get Metadata Section**

![image](https://github.com/user-attachments/assets/be50b5c1-9ea3-4bea-8d6c-f24470437902)

- **NPUB:**

  - Entrez une clé publique (NPUB) pour récupérer ses métadonnées associées.

- **Get Metadata Button:**
  - Appuyez sur ce bouton pour récupérer et afficher les informations liées à la clé publique spécifiée.

## **5. Relays**

![image](https://github.com/user-attachments/assets/f0e1d264-e16f-4d96-b9ff-a262b8dcd707)

- Liste des relais actifs auxquels votre application est connectée.

  - Exemple :
    - `wss://nostr.wine`
    - `wss://nostr.lu.ke`
    - `wss://nos.lol`
    - `wss://relay.snort.social`

- Chaque relais a une icône 🗑️ pour supprimer ce relais de la liste.

### **Ajouter un Relais**

1. **Champ Relay:**
   - Entrez l'URL du nouveau relais dans le format WebSocket : `wss://new.relay.url`.
2. **Bouton "Update relay list":**
   - Appuyez sur ce bouton pour ajouter le relais spécifié à la liste existante.

## **6. Intro Message**

![image](https://github.com/user-attachments/assets/ecb84a14-725c-4776-9728-d616acc47538)

- **Description :**
  - Un message d'introduction automatique envoyé par le bot Nostr quand la commande ne match pas .
- **Option "Disable Nostr-bot intro message":**
  - Cochez cette case pour désactiver l'envoi automatique des messages d'introduction.

## **7. Received Messages**

![image](https://github.com/user-attachments/assets/609c4fa9-e649-4a78-a1d0-a53f52781c27)

- **Description :** Liste des messages reçus depuis les relais connectés.
  - Affiche les informations suivantes :
    - 📅 **Date et Heure**
    - 🆔 **Clé publique (NPUB)** de l'expéditeur
    - ✉️ **Contenu du message**
  - Exemple :
    - **26/11/2024, 10:59:23**
      - Clé publique : `npub1ncecgaxk4l70594uq...`
      - Message : `!Catalog`
    - **04/11/2024, 13:22:21**
      - Clé publique : `npub1qh8fj9wqc7lw5z37g...`
      - Message : `Hello`

## Nostr-bot

Maintenant vous aurez la possibilité d'interagir avec le bot nostr en envoyant des commandes à votre adresse nostr.
Pour avoir la liste des commandes tapez `!help`

![image](https://github.com/user-attachments/assets/c038ecbf-022a-4d41-9440-a6414f9ee7be)
