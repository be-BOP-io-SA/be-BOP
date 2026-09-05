# Acceso al back-office

Las personas con una cuenta de empleado de be-BOP y el super-administrador pueden iniciar sesión en el back-office a través de /admin

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Primer inicio de sesión y acceso seguro

Como la URL /admin es demasiado obvia, el propietario del be-BOP puede configurar una cadena especial para asegurar el acceso al back-office.

Para hacerlo, cuando crees tu be-BOP, ve a /admin/config, luego a esta área:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Una vez hecho esto, el acceso será posible a través de la URL /admin-cadenaconfigurada/login

El acceso a una URL de admin incorrecta redirigirá a esta página:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Un empleado con acceso de lectura/escritura a /admin/arm puede enviarte un enlace de restablecimiento de contraseña, que contiene la URL incluyendo /admins-secret

Cuando un usuario ha iniciado sesión, la URL /admin redirige automáticamente al enlace correcto.

## Inicio de sesión de empleado

El formulario de inicio de sesión del empleado se encuentra en /admin-secret/login

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

Puedes extender el tiempo de espera de la sesión inicial en la conexión:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

Luego tendrás acceso al área de administración, dependiendo de los derechos asignados a tu rol:
- Si tienes derechos de lectura/escritura, el enlace del submenú es normal
- Si tienes derechos de solo lectura, el enlace del submenú está en cursiva (cualquier acción en la página será rechazada)
- Si no tienes derechos de solo lectura, el enlace del submenú estará oculto, y un intento de acceder por URL directa te enviará de vuelta a la página principal de admin.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Seguridad de la contraseña

Durante el inicio de sesión del empleado, se verifica tu contraseña.
Los primeros y últimos caracteres cifrados de tu cadena de contraseña se envían a [Have I Been Pawned](https://haveibeenpwned.com/), que devuelve una serie de cadenas completas.
be-BOP luego verifica localmente si tu contraseña está presente en esta lista (para que no se comunique directamente a Have I Been Pawned).
Si la contraseña está presente, serás bloqueado con este mensaje de seguridad, invitándote a cambiar tu contraseña:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Cerrar sesión del back-office

Puedes cerrar sesión haciendo clic en el icono rojo junto a la etiqueta "Admin" en el encabezado.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

Luego serás redirigido a la página de inicio de sesión.

## Recuperación de contraseña

Si pierdes tu contraseña, puedes ir a /admin-secret/login y hacer clic en "Recovery":

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

Luego se te pedirá que ingreses tu identificador.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Si ingresas un identificador incorrecto, se te notificará, y podrás intentar nuevamente con uno diferente. Si no puedes encontrar tu identificador, tendrás que pedirle al administrador del be-BOP que te proporcione la información nuevamente.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

En caso de abuso por parte de un empleado, se activará una protección:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Si el identificador existe, este mensaje se envía a la dirección de contacto vinculada a la cuenta (correo electrónico, npub, o ambos):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Usar un enlace expirado o ya utilizado te llevará de vuelta a una página de error:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Este enlace contiene un token de uso único que te envía a la página de restablecimiento de contraseña.

Si la contraseña que ingresas es demasiado corta, se mostrará este bloqueo:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Si la contraseña se detecta en Have I Been Pwned, se mostrará este bloqueo:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Si la contraseña es válida, serás redirigido a la página de inicio de sesión y ahora podrás iniciar sesión con ella.
