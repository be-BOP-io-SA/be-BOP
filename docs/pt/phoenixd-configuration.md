# Configuração PhoenixD para Pagamentos Lightning

Para aceitar pagamentos Lightning no seu be-BOP, pode configurar o PhoenixD em **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Instalar o PhoenixD

Para instalar o PhoenixD no seu servidor, pode seguir este link [https://phoenix.acinq.co/server/get-started].

## Configuração do PhoenixD

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Após a instalação, o seu be-BOP precisa de detetar o PhoenixD. Para isso, vá à página de configuração do PhoenixD, introduza o seu URL PhoenixD e clique no botão Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Se estiver a executar o be-BOP (mas não o PhoenixD) em Docker:

- Altere o URL para http://host.docker.internal:9740
- Execute o PhoenixD com `--http-bind-ip=0.0.0.0`
- Certifique-se de que a sua firewall aceita conexões na porta 9740 do seu contentor Docker. Por exemplo, com ufw: `ufw allow from any to any port 9740`.

Após detetar o seu PhoenixD, ser-lhe-á pedido que adicione a sua palavra-passe HTTP do PhoenixD (encontrada em phoenix.conf) neste formulário.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Guarde, e terá as suas informações PhoenixD.

- O nó

  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)

- O saldo

  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)

- Pode pagar as suas faturas clicando em withdraw

  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)

  e preencher as informações aqui

  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Pagamento com Lightning

Após configurar o PhoenixD, pode receber pagamentos Lightning no seu be-BOP sem precisar de um nó LND.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
