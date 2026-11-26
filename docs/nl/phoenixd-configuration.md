# Configuratie van phoenixd voor Lightning-betalingen

Om Lightning-betalingen te accepteren in uw be-BOP kunt u een phoenixd configureren in **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Installatie van PhoenixD

Om phoenixd op uw server te installeren, kunt u deze link volgen [https://phoenix.acinq.co/server/get-started].

## Configuratie PhoenixD

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Na de installatie moet uw be-BOP de phoenixd detecteren. Ga hiervoor naar de phoenixd-configuratiepagina, voer de URL van uw phoenixd in en klik op de knop Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Als u be-BOP (maar niet phoenixd) in Docker draait:

- Wijzig de URL naar http://host.docker.internal:9740
- Start Phoenixd met `--http-bind-ip=0.0.0.0`
- Zorg ervoor dat uw firewall verbindingen op poort 9740 vanaf uw Docker-container accepteert. Bijvoorbeeld met ufw: `ufw allow from any to any port 9740`.

Na detectie van uw phoenixd wordt u uitgenodigd om uw PhoenixD http password in te voeren dat zich in phoenix.conf bevindt in dit formulier.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Sla op en daarna heeft u de informatie van uw phoenixd.

- het knooppunt

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- het saldo

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- u kunt uw facturen betalen door op withdraw te klikken

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  en de informatie hier invullen

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Betalen met Lightning

Na het configureren van phoenixd kunt u Lightning-betalingen ontvangen op uw be-BOP zonder dat u een LND-knooppunt nodig heeft.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
