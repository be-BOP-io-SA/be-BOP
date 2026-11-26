# PhoenixD Configuration for Lightning Payments

To accept Lightning payments in your be-BOP, you can configure PhoenixD in **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Installing PhoenixD

To install PhoenixD on your server, you can follow this link [https://phoenix.acinq.co/server/get-started].

## PhoenixD Configuration

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

After installation, your be-BOP needs to detect PhoenixD. To do this, go to the PhoenixD configuration page, enter your PhoenixD URL, then click the Detect PhoenixD Server button.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

If you are running be-BOP (but not PhoenixD) in Docker:

- Change the URL to http://host.docker.internal:9740
- Run PhoenixD with `--http-bind-ip=0.0.0.0`
- Make sure your firewall accepts connections on port 9740 from your Docker container. For example, with ufw: `ufw allow from any to any port 9740`.

After detecting your PhoenixD, you will be prompted to add your PhoenixD HTTP password (found in phoenix.conf) in this form.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Save, and then you will have your PhoenixD information.

- The node

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- The balance

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- You can pay your invoices by clicking on withdraw

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  and fill in the information here

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Paying with Lightning

After configuring PhoenixD, you can receive Lightning payments on your be-BOP without needing an LND node.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
