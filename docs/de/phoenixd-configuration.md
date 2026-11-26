# PhoenixD-Konfiguration für Lightning-Zahlungen

Um Lightning-Zahlungen in Ihrem be-BOP zu akzeptieren, können Sie PhoenixD unter **Admin** > **Payment Settings** > **PhoenixD** konfigurieren.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## PhoenixD installieren

Um PhoenixD auf Ihrem Server zu installieren, können Sie diesem Link folgen [https://phoenix.acinq.co/server/get-started].

## PhoenixD-Konfiguration

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Nach der Installation muss Ihr be-BOP PhoenixD erkennen. Gehen Sie dazu auf die PhoenixD-Konfigurationsseite, geben Sie Ihre PhoenixD-URL ein und klicken Sie dann auf die Schaltfläche Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Wenn Sie be-BOP (aber nicht PhoenixD) in Docker ausführen:

- Ändern Sie die URL zu http://host.docker.internal:9740
- Führen Sie PhoenixD mit `--http-bind-ip=0.0.0.0` aus
- Stellen Sie sicher, dass Ihre Firewall Verbindungen auf Port 9740 von Ihrem Docker-Container akzeptiert. Zum Beispiel mit ufw: `ufw allow from any to any port 9740`.

Nach der Erkennung Ihres PhoenixD werden Sie aufgefordert, Ihr PhoenixD-HTTP-Passwort (in phoenix.conf zu finden) in dieses Formular einzugeben.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Speichern Sie, und dann haben Sie Ihre PhoenixD-Informationen.

- Der Knoten

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- Das Guthaben

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- Sie können Ihre Rechnungen bezahlen, indem Sie auf Withdraw klicken

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  und die Informationen hier ausfüllen

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Zahlung mit Lightning

Nach der Konfiguration von PhoenixD können Sie Lightning-Zahlungen in Ihrem be-BOP empfangen, ohne einen LND-Knoten zu benötigen.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
