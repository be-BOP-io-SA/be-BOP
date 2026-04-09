# Configuración de PhoenixD para Pagos Lightning

Para aceptar pagos Lightning en su be-BOP, puede configurar PhoenixD en **Admin** > **Payment Settings** > **PhoenixD**.

![image](https://github.com/user-attachments/assets/0e4bb73f-8f90-4c4b-8cc4-fcd0c7c0ddf6)

## Instalación de PhoenixD

Para instalar PhoenixD en su servidor, puede seguir este enlace [https://phoenix.acinq.co/server/get-started].

## Configuración de PhoenixD

![image](https://github.com/user-attachments/assets/4263703c-52bb-4895-ac57-380df036731a)

Después de la instalación, su be-BOP necesita detectar PhoenixD. Para esto, vaya a la página de configuración de PhoenixD, ingrese la URL de su PhoenixD y haga clic en el botón Detect PhoenixD Server.

- ![image](https://github.com/user-attachments/assets/eb7a90f3-c4ee-48fb-9498-a3984f67011a)
- ![image](https://github.com/user-attachments/assets/bd96cfd3-595b-40a0-84af-14ff4f88cf7a)

Si está ejecutando be-BOP (pero no PhoenixD) en Docker:

- Cambie la URL a http://host.docker.internal:9740
- Ejecute PhoenixD con `--http-bind-ip=0.0.0.0`
- Asegúrese de que su firewall acepte conexiones en el puerto 9740 desde su contenedor Docker. Por ejemplo, con ufw: `ufw allow from any to any port 9740`.

Después de detectar su PhoenixD, se le pedirá que agregue su contraseña HTTP de PhoenixD (que se encuentra en phoenix.conf) en este formulario.

![image](https://github.com/user-attachments/assets/86a3241e-e736-4747-8ed9-406ffbc9cbb4)

Guarde y luego tendrá la información de su PhoenixD.

- El nodo
  ![image](https://github.com/user-attachments/assets/58bb671c-0981-4bca-9889-79cc7f11c8d9)
- El balance
  ![image](https://github.com/user-attachments/assets/36be219f-be48-4cf0-9bb9-09b0d77fd956)
- Puede pagar sus facturas haciendo clic en withdraw
  ![image](https://github.com/user-attachments/assets/b6c059eb-14cc-4bc8-bc2f-24e632ffc931)
  y completar la información aquí
  ![image](https://github.com/user-attachments/assets/698ce241-d859-47ea-9b66-de33ddc7d4ba)

## Pagar con Lightning

Después de configurar PhoenixD, puede recibir pagos Lightning en su be-BOP sin necesidad de un nodo LND.

![image](https://github.com/user-attachments/assets/3e877413-90ef-44cf-8074-3206145b1fc1)
