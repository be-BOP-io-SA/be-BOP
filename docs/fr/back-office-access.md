# Accès au back-office

Les gens possédant un compte be-BOP employé et le super-admin peuvent se connecter au back-office via /admin

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Première connexion et accès sécurisé

L'url /admin étant trop évidente, le ou la propriétaire du be-BOP peut configurer une chaine spéciale pour sécuriser l'accès au back-office.

Pour cela, à la crétion du be-BOP il faut se rendre dans /admin/config, puis dans cette zone :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Une fois effectué, l'accès sera possible via l'url /admin-chaineconfiguree/login

Un accès à une mauvaise URL admin renverra vers cette page :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Un employé avec accès lecture / écriture à /admin/arm pourra vous renvoyer un lien de réinitialisation de mot de passe, qui contient l'URL incluant /admins-secret

Lorsqu'un utilisateur ou qu'une utilisatrice est loguée, l'url /admin renvoie automatiquement vers le bon lien.

## Connexion employée

Le formulaire de connexion employé.e se situe sur l'url /admin-secret/login

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

Vous pouvez rallonger le timeout de session initial à la connexion :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

Vous aurez ensuite accès à l'admin, en fonction des droits qui auront été attribués à votre rôle :
- si vous avez les droits en lecture / écriture, le lien du sous menu est normal
- si vous avez les droits en lecture seule, le lien du sous menu est italique (toute action sur la page sera refusée)
- si vous n'avez pas les droits en lecture, le lien du sous menu sera masqué, et une tentative d'accès par url directe vous renverra vers la homepage de l'admin

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Protection du mot de passe

Lors de la connexion employé.e, votre mot de passe est contrôlé.
Les premiers et derniers caractères chiffrés de la chaîne de votre mot de passe sont envoyés à [Have I Been Pawned](https://haveibeenpwned.com/), qui nous renvoie une série de chaines entières.
be-BOP contrôle ensuite localement si votre mot de passe est présent dans cette liste (ainsi, il n'est pas communiqué directement à Have I Been Pawned).
Si le mot de passe y est présent, vous serez bloqué avec ce message de sécurité, vous invitant à changer de mot de passe :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Se déconnecter du back office

Vous pouvez fermer votre session en cliquant sur l'icône rouge à côté du libellé "Admin" dans le header.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

Vous êtes alors ramené vers la page de login.

## Récupération du mot de passe

En cas de perte de mot de passe, vous pouvez accéder à /admin-secret/login et cliquer sur "Recovery" :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

Vous êtes alors amené à saisir votre identifiant.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Si vous vous trompez d'idenfitiant, cela vous le sera signalé, et vous pourrez retenter l'opération avec un autre identifiant. Si vous ne retrouvez pas votre identifiant, il faudra demander à l'administrateur du be-BOP de vous redonner l'information.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

En cas d'abus par un employé, une protection sera déclenchée :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Si le login existe, ce message est envoyé à l'adresse de contact liée au compte (email, npub, ou les deux) :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Utiliser un lien expiré ou déjà utilisé vous ramènera vers une page d'erreur :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Ce lien contient un token à usage unique qui vous envoie vers la page de réinitialisation du mot de passe.

Si le mot de passe renseigné est trop court, ce blocage s'affichera :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Si le mot de passe est détecté sur Have I Been Pwned, ce blocage s'affichera :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Si le mot de passe est valide, vous êtes renvoyé vers la page d'identification et pouvez désormais vous connecter avec.
