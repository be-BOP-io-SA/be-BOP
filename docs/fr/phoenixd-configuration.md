# Configuration phoenixd pour paiement lightning

Pour accepter des paiements lightning dans votre be-bop vous pouvez configurer un phoenixd dans **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Installation de PhoenixD

Pour installer le phoenixd sur votre serveur vous pouvez suivre ce lien [https://phoenix.acinq.co/server/get-started].

## Configuration PhoenixD

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Aprés installation il faudra que votre be-bop detecter le phoenixd pour cela accedez à la page de configuration phoenixd et taper l'url de votre pheonixd puis sur le bouton Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Si vous exécutez be-BOP (mais pas phoenixd) dans Docker :

- Changez l'URL en http://host.docker.internal:9740
- Exécutez Phoenixd avec `--http-bind-ip=0.0.0.0`
- Assurez-vous que votre pare-feu accepte les connexions sur le port 9740 depuis votre conteneur Docker. Par exemple, avec ufw : `ufw allow from any to any port 9740`.

Aprés detection de votre phoenixd vous etes invité à ajouter votre PhoenixD http password qui est dans phoenix.conf sur ce formulaire.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Sauvegarder et apres vous avez les informations de votre phoenixd.

- le noeud

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- la balance

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- vous pouvez payer vos invoice en cliquant sur withdraw

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  et remplir les informations ici

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Payer en lightning

Apres avoir configurer phoenixd vous pouvez recevoir des paiements lightning sur votre be-bop sans besoin de noeud lnd.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
