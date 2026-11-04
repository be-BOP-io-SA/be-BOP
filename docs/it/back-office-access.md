# Accesso al back-office

Le persone con un account dipendente be-BOP e il super-admin possono accedere al back-office tramite /admin

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Primo accesso e accesso sicuro

Poiché l'URL /admin è troppo ovvio, il proprietario del be-BOP può configurare una stringa speciale per proteggere l'accesso al back-office.

Per farlo, quando crei il be-BOP, vai su /admin/config, poi in questa sezione:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Una volta fatto, l'accesso sarà possibile tramite l'URL /admin-stringaconfigurata/login

L'accesso all'URL admin errato reindirizzerà a questa pagina:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Un dipendente con accesso in lettura/scrittura a /admin/arm può inviarti un link per il reset della password, che contiene l'URL con /admins-secret

Quando un utente è connesso, l'URL /admin reindirizza automaticamente al link corretto.

## Accesso dipendente

Il modulo di accesso dipendente si trova su /admin-secret/login

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

Puoi estendere il timeout iniziale della sessione alla connessione:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

Avrai quindi accesso all'area di amministrazione, in base ai diritti assegnati al tuo ruolo:
- se hai diritti di lettura/scrittura, il link del sotto-menu è normale
- se hai diritti di sola lettura, il link del sotto-menu è in corsivo (qualsiasi azione sulla pagina verrà rifiutata)
- se non hai diritti di sola lettura, il link del sotto-menu sarà nascosto e un tentativo di accesso tramite URL diretto ti riporterà alla pagina principale dell'admin.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Sicurezza della password

Durante l'accesso del dipendente, la tua password viene verificata.
I primi e gli ultimi caratteri crittografati della tua stringa di password vengono inviati a [Have I Been Pwned](https://haveibeenpwned.com/), che restituisce una serie di stringhe complete.
be-BOP verifica quindi localmente se la tua password è presente in questa lista (in modo che non venga comunicata direttamente a Have I Been Pwned).
Se la password è presente, sarai bloccato con questo messaggio di sicurezza, che ti invita a cambiare la password:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Disconnessione dal back-office

Puoi disconnetterti cliccando sull'icona rossa accanto all'etichetta "Admin" nell'intestazione.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

Verrai quindi reindirizzato alla pagina di accesso.

## Recupero della password

Se perdi la password, puoi andare su /admin-secret/login e cliccare su "Recovery":

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

Ti verrà quindi chiesto di inserire il tuo login.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Se inserisci l'identificativo sbagliato, verrai avvisato e potrai riprovare con uno diverso. Se non riesci a trovare il tuo identificativo, dovrai chiedere all'amministratore del be-BOP di fornirti nuovamente le informazioni.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

In caso di abuso da parte di un dipendente, verrà attivata una protezione:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Se il login esiste, questo messaggio viene inviato all'indirizzo di contatto associato all'account (email, npub o entrambi):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

L'utilizzo di un link scaduto o già utilizzato ti porterà a una pagina di errore:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Questo link contiene un token monouso che ti porta alla pagina di reset della password.

Se la password inserita è troppo corta, verrà visualizzato questo blocco:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Se la password viene rilevata su Have I Been Pwned, verrà visualizzato questo blocco:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Se la password è valida, verrai reindirizzato alla pagina di accesso e potrai ora accedere con essa.
