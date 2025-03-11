# Configuration de Bitcoin Nodeless

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

Cette page permet de configurer le module "Bitcoin nodeless" pour générer des adresses et suivre les paiements Bitcoin tout en gardant le contrôle total des fonds sur votre propre portefeuille.
Il est accessible sur **Admin** > **Payment Settings** > **Bitcoin nodeless**

---

## **Configuration**

### **1. BIP Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Description** : Standard BIP utilisé pour générer les adresses Bitcoin.
- **Options disponibles** :
  - `BIP 84` (actuellement, c'est la seule option prise en charge).
- **Instructions** :
  - Si vous utilisez un portefeuille compatible, choisissez `BIP 84`.

---

### **2. Clé publique (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Description** : Une clé publique au format `zpub` pour les transactions Bitcoin.
- **Instructions** :
  - Utilisez un portefeuille comme **Sparrow Wallet** pour générer une clé `zpub` ou `vpub` (pour testnet).
  - Assurez-vous que le chemin de dérivation est :
    - Mainnet : `m/84'/0'/0'`
    - Testnet : `m/84'/1'/0'`
  - Entrez la clé dans le champ.

---

### **3. Indice de dérivation**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Description** : L'indice de l'adresse à générer.
- **Instructions** :
  - Par défaut, commence à `0` et s'incrémente de `1` pour chaque nouvelle adresse générée.
  - **Ne modifiez pas cette valeur** sauf si vous savez ce que vous faites, cela pourrait entraîner la réutilisation d'adresses ou créer des adresse qui ne seront pas détectés par votre wallet

---

### **4. URL de Mempool**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Description** : URL de l'API Mempool pour vérifier les fonds entrants sur les adresses générées.
- **Exemple par défaut** :
  - Testnet : `https://mempool.space/testnet`
- **Instructions** :
  - Si vous hébergez votre propre instance Mempool, vous pouvez remplacer cette URL.
  - Pour le testnet, ajoutez le suffixe `/testnet`.

---

## **Adresses générées suivantes**

Les prochaines adresses générées à partir de cette configuration sont affichées dans la section **"Next addresses"**. Ces adresses sont basées sur la clé publique et l'indice de dérivation.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
