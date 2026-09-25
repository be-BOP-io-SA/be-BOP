# Configurazione phoenixd per pagamenti Lightning

Per accettare pagamenti Lightning nel vostro be-BOP potete configurare un phoenixd in **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Installazione di PhoenixD

Per installare phoenixd sul vostro server potete seguire questo link [https://phoenix.acinq.co/server/get-started].

## Configurazione PhoenixD

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Dopo l'installazione dovrete far rilevare il phoenixd dal vostro be-BOP. Per farlo accedete alla pagina di configurazione phoenixd e inserite l'URL del vostro phoenixd poi cliccate sul pulsante Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Se eseguite be-BOP (ma non phoenixd) in Docker:

- Cambiate l'URL in http://host.docker.internal:9740
- Eseguite Phoenixd con `--http-bind-ip=0.0.0.0`
- Assicuratevi che il vostro firewall accetti le connessioni sulla porta 9740 dal vostro container Docker. Ad esempio, con ufw: `ufw allow from any to any port 9740`.

Dopo il rilevamento del vostro phoenixd vi viene chiesto di aggiungere la vostra PhoenixD http password che si trova in phoenix.conf in questo modulo.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Salvate e dopo avrete le informazioni del vostro phoenixd.

- il nodo

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- il saldo

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- potete pagare le vostre invoice cliccando su withdraw

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  e compilare le informazioni qui

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Pagare in Lightning

Dopo aver configurato phoenixd potete ricevere pagamenti Lightning sul vostro be-BOP senza bisogno di un nodo lnd.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
