#Introduction

Cette documentation a pour but de permettre aux propriétaires d'un be-BOP de pouvoir configurer l'envoi automatique d'emails de la manière la plus simple et gratuite qui ait été trouvée.

Les fournisseurs d'email testés à ce jour qui fonctionnent sont :
- Outlook.fr
- (à suivre)

Ceux qui ne fonctionnent pas (restriction DMARC) sont :
- GMail
- Protonmail
- (à suivre)

N'hésitez pas à tester et nous dire si vos fournisseurs email fonctionnent ou non sur contact@be-bop.io

# Préface

Il était une fois un temps merveilleux où les possesseurs d'un site interactif ou d'un commerce en ligne pouvaient librement envoyer des emails automatiques gratuitement.
C'était le temps où les fournisseurs d'emails gratuits permettaient aisément l'usage d'une boîte email par une application tierce.
C'était le temps où le SMTP transactionnel était permis et gratuit.
C'était le temps où les gens étaient heureux.
C'était le temps.
Mais puis un jour la nation du Paywall décida de passer à l'attaque...

Désormais, le SMTP transactionnel, quand il n'est pas strictement interdit, est soumis à un token SMTP proposé uniquement dans une formule business payante, ou est dépendant d'un 3rd party spécialisé dans l'envoi d'emails en masse, à grands renforts de paramétrages de zone DNS mettant à l'écart l'utilisateur et l'utilisatrice lambda, qui doivent désormais faire appel à d'onéreuses web-agencies pour paramétrer un service d'abord gratuit puis rapidement payant.
Ces personnes, qui n'ont peut-être besoin que de notifier une dizaine de commandes passées en ligne chaque mois, étaient alors désoeuvrées...
Ne leur restaient comme autre choix :
- l'abonnement à un service d'email payant
- l'abonnement à certains fournisseurs de domaines spécifiques mettant également à disposition des emails
- l'usage de 3rd party complexes nécessitant une assistance technique ou un temps d'apprentissage non-négligeable
- l'abandon des notifications emails, et le rejet par leurs premiers clients suite à cette lacune

...et puis l'équipe de be-BOP est arrivée avec smtp2go.

# Description

smtp2go est une plateforme cloud de diffusion d'emails qui permet d'envoyer et de suivre les e-mails.
Bien que l'usage d'une 3rd party n'est pas idéale, c'est le meilleur compris trouvé à ce jour pour les gens ne disposant pas de compte email autorisant le SMTP transactionnel.
Via l'association de smtp2go avec une adresse email existante, et une vérification technique simple du compte email, smtp2go permet à be-BOP d'envoyer des emails dans la limite de 1000 / mois sur sa formule gratuite.

# Procédure

- Créez (ou ayez à disposition) une adresse email consultable qui sera destinataire des emails envoyés par be-BOP aux visiteurs, clients et employés.
- Allez sur https://smtp2go.com
- Cliquez sur "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Renseignez votre adresse email (celle qui sera utilisée par be-BOP ou la vôtre, elles peuvent être différentes)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Renseignez vos informations d'identité et d'entreprise (le mot de passe n'est demandé qu'une fois, vérifiez bien votre saisie)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- Il vous sera demandé de valider votre adresse email :
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Accédez à votre messagerie, ouvrez le message de SMTP2GO puis cliquez sur le lien de confirmation dans le corps du message
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Votre compte sera désormais activé
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Vérifiez ensuite l'expéditeur (bouton vert "Add a verified sender") et choisissez l'option de droite "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Renseignez l'adresse email qui sera utilisée par be-BOP puis validez le formulaire
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Si votre fournisseur d'email ne bloque pas l'option, vous aurez cet affichage :
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
Vous aurez également ce message par email : il faudra le valider en cliquant sur le bouton "Verify email@domain.com"
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
En revanche, si vous avez le message suivant, c'est que votre fournisseur d'email refuse l'association (probablement parce qu'il propose le service SMTP transactionnel payant ou sous autres conditions) :
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Une fois l'email de vérification validé, votre expéditeur devrait être affiché ainsi :
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- Dans le menu de gauche, rendez-vous ensuite sur "SMTP Users" puis cliquez sur "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Cliquez sur "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO pré-remplit le formulaire avec un utilisateur SMTP dont l'Username par défaut est le domaine de votre adresse email d'envoi. Vous pouvez le laissez ainsi, ou le personnaliser pour raisons de sécurité (et l'identifiant devant être unique sur SMTP2GO, un identifiant trop simple sera déjà utilisé et vous sera refusé), . Validez ensuite en cliquant sur le bouton "Add SMTP User".
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- Vous pourrez ensuite configurer be-BOP avec les informations suivantes puis le relancer :
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=le_login_utilisateur_choisi_sur_smtp2go
SMTP_PASSWORD=le_mot_de_passe_choisi_sur_smtp2go
```

# Attention à votre configuration

Pour éviter d'avoir des problèmes d'envoi de message, assurez-vous que l'adresse email d'envoi soit la même que celle configurée dans le back-office be-BOP, dans Admin > Config > Identity, partie "Contact Information > Email" :
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Avertissement

- au-delà de 1000 emails envoyés par mois, l'envoi des emails ne fonctionnera plus, et SMTP2GO vous enverra une sollicitation pour passer sur une formule payante
- le logiciel be-BOP n'est aucunement associé ou affilié au service SMTP2GO
- be-bop.io n'est aucunement associé ou affilié à smtp2go.com
- be-BOP.io SA n'est aucunement associée ou affiliée à SMTP2GO
- l'équipe de be-BOP n'assure pas le support de SMTP2GO
- l'équipe de be-BOP fournit uniquement cette documentation pour débloquer leurs utilisateurs et utilisatrices et leur éviter de passer par des services payants ou complexes

Mort aux paywalls ✊
