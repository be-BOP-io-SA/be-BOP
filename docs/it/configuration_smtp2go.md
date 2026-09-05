# Introduzione

Questa documentazione ha lo scopo di permettere ai proprietari di un be-BOP di poter configurare l'invio automatico di email nel modo più semplice e gratuito trovato.

I fornitori di email testati ad oggi che funzionano sono:
- Outlook.fr
- (da seguire)

Quelli che non funzionano (restrizione DMARC) sono:
- GMail
- Protonmail
- (da seguire)

Non esitate a testare e a farci sapere se i vostri fornitori email funzionano o meno su contact@be-bop.io

# Prefazione

C'era una volta un tempo meraviglioso in cui i possessori di un sito interattivo o di un commercio online potevano liberamente inviare email automatiche gratuitamente.
Era il tempo in cui i fornitori di email gratuiti permettevano facilmente l'uso di una casella email da parte di un'applicazione terza.
Era il tempo in cui lo SMTP transazionale era permesso e gratuito.
Era il tempo in cui le persone erano felici.
Era il tempo.
Ma poi un giorno la nazione del Paywall decise di passare all'attacco...

Ormai, lo SMTP transazionale, quando non è strettamente vietato, è soggetto a un token SMTP proposto unicamente in una formula business a pagamento, o dipende da un servizio terzo specializzato nell'invio massivo di email, con grandi configurazioni di zone DNS che mettono da parte l'utente comune, che deve ormai ricorrere a costose web agency per configurare un servizio inizialmente gratuito poi rapidamente a pagamento.
Queste persone, che magari hanno bisogno solo di notificare una decina di ordini effettuati online ogni mese, erano allora sconsolate...
Non restava loro che:
- l'abbonamento a un servizio email a pagamento
- l'abbonamento a certi fornitori di domini specifici che mettono a disposizione anche delle email
- l'utilizzo di servizi terzi complessi che richiedono assistenza tecnica o un tempo di apprendimento non trascurabile
- l'abbandono delle notifiche email, e il rifiuto da parte dei loro primi clienti a causa di questa lacuna

...e poi il team di be-BOP è arrivato con smtp2go.

# Descrizione

smtp2go è una piattaforma cloud di distribuzione email che permette di inviare e monitorare le email.
Sebbene l'uso di un servizio terzo non sia ideale, è il miglior compromesso trovato ad oggi per le persone che non dispongono di un account email che autorizzi lo SMTP transazionale.
Tramite l'associazione di smtp2go con un indirizzo email esistente, e una verifica tecnica semplice dell'account email, smtp2go permette a be-BOP di inviare email nel limite di 1000 al mese con la formula gratuita.

# Procedura

- Create (o abbiate a disposizione) un indirizzo email consultabile che sarà il destinatario delle email inviate da be-BOP ai visitatori, clienti e dipendenti.
- Andate su https://smtp2go.com
- Cliccate su "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Inserite il vostro indirizzo email (quello che sarà utilizzato da be-BOP o il vostro, possono essere diversi)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Inserite le vostre informazioni di identità e aziendali (la password viene chiesta una sola volta, verificate bene la vostra digitazione)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- Vi verrà chiesto di validare il vostro indirizzo email:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Accedete alla vostra casella di posta, aprite il messaggio di SMTP2GO poi cliccate sul link di conferma nel corpo del messaggio
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Il vostro account sarà ora attivato
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Verificate poi il mittente (pulsante verde "Add a verified sender") e scegliete l'opzione di destra "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Inserite l'indirizzo email che sarà utilizzato da be-BOP poi validate il modulo
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Se il vostro fornitore di email non blocca l'opzione, avrete questa visualizzazione:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
Riceverete anche questo messaggio via email: dovrete validarlo cliccando sul pulsante "Verify email@domain.com"
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
Se invece ricevete il seguente messaggio, significa che il vostro fornitore di email rifiuta l'associazione (probabilmente perché propone il servizio SMTP transazionale a pagamento o sotto altre condizioni):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Una volta validata l'email di verifica, il vostro mittente dovrebbe essere visualizzato così:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- Nel menu di sinistra, andate poi su "SMTP Users" poi cliccate su "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Cliccate su "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO precompila il modulo con un utente SMTP il cui Username predefinito è il dominio del vostro indirizzo email di invio. Potete lasciarlo così, o personalizzarlo per motivi di sicurezza (e dato che l'identificativo deve essere unico su SMTP2GO, un identificativo troppo semplice sarà già utilizzato e vi verrà rifiutato). Validate poi cliccando sul pulsante "Add SMTP User".
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- Potrete quindi configurare be-BOP con le seguenti informazioni e poi riavviarlo:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=il_login_utente_scelto_su_smtp2go
SMTP_PASSWORD=la_password_scelta_su_smtp2go
```

# Attenzione alla vostra configurazione

Per evitare problemi di invio dei messaggi, assicuratevi che l'indirizzo email di invio sia lo stesso configurato nel back-office be-BOP, in Admin > Config > Identity, sezione "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Avvertenze

- oltre 1000 email inviate al mese, l'invio delle email non funzionerà più, e SMTP2GO vi invierà una sollecitazione per passare a una formula a pagamento
- il software be-BOP non è in alcun modo associato o affiliato al servizio SMTP2GO
- be-bop.io non è in alcun modo associato o affiliato a smtp2go.com
- be-BOP.io SA non è in alcun modo associata o affiliata a SMTP2GO
- il team di be-BOP non fornisce supporto per SMTP2GO
- il team di be-BOP fornisce unicamente questa documentazione per sbloccare i propri utenti e aiutarli a evitare servizi a pagamento o complessi

Morte ai paywall ✊
