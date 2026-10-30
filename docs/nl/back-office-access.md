# Backoffice-toegang

Personen met een be-BOP-werknemersaccount en de super-admin kunnen inloggen op de backoffice via /admin

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Eerste keer inloggen en beveiligde toegang

Omdat de /admin-URL te voor de hand liggend is, kan de be-BOP-eigenaar een speciale tekenreeks configureren om de toegang tot de backoffice te beveiligen.

Om dit te doen, gaat u bij het aanmaken van be-BOP naar /admin/config en vervolgens naar dit gedeelte:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Zodra dit is ingesteld, is de toegang mogelijk via de URL /admin-geconfigureerdereeks/login

Toegang tot de verkeerde admin-URL leidt naar deze pagina:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Een werknemer met lees-/schrijftoegang tot /admin/arm kan u een link voor wachtwoordherstel sturen, die de URL inclusief /admins-secret bevat.

Wanneer een gebruiker is ingelogd, wordt de /admin-URL automatisch doorgestuurd naar de juiste link.

## Werknemer inloggen

Het inlogformulier voor werknemers bevindt zich op /admin-secret/login

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

U kunt de initiële sessietime-out verlengen bij het verbinden:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

U krijgt dan toegang tot het beheergedeelte, afhankelijk van de rechten die aan uw rol zijn toegewezen:
- als u lees-/schrijfrechten heeft, is de submenulink normaal
- als u alleen-lezenrechten heeft, staat de submenulink cursief (elke actie op de pagina wordt geweigerd)
- als u geen alleen-lezenrechten heeft, wordt de submenulink verborgen en wordt een poging om deze via directe URL te bereiken teruggestuurd naar de startpagina van de admin.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Wachtwoordbeveiliging

Tijdens het inloggen van werknemers wordt uw wachtwoord gecontroleerd.
De eerste en laatste versleutelde tekens van uw wachtwoordreeks worden naar [Have I Been Pwned](https://haveibeenpwned.com/) gestuurd, dat een reeks volledige tekenreeksen retourneert.
be-BOP controleert vervolgens lokaal of uw wachtwoord in deze lijst voorkomt (zodat het niet rechtstreeks aan Have I Been Pwned wordt gecommuniceerd).
Als het wachtwoord aanwezig is, wordt u geblokkeerd met dit beveiligingsbericht, met het verzoek uw wachtwoord te wijzigen:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Uitloggen uit de backoffice

U kunt uitloggen door op het rode pictogram naast het label "Admin" in de header te klikken.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

U wordt vervolgens teruggestuurd naar de inlogpagina.

## Wachtwoordherstel

Als u uw wachtwoord kwijt bent, kunt u naar /admin-secret/login gaan en op "Recovery" klikken:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

U wordt vervolgens gevraagd uw inlognaam in te voeren.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Als u de verkeerde identificatie invoert, wordt u hiervan op de hoogte gesteld en kunt u het opnieuw proberen met een andere. Als u uw identificatie niet kunt vinden, moet u de be-BOP-beheerder vragen om de informatie opnieuw te verstrekken.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

Bij misbruik door een werknemer wordt een bescherming geactiveerd:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Als de inlognaam bestaat, wordt dit bericht verzonden naar het contactadres dat aan het account is gekoppeld (e-mail, npub of beide):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Het gebruik van een verlopen of reeds gebruikte link brengt u terug naar een foutpagina:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Deze link bevat een eenmalig token dat u naar de pagina voor wachtwoordherstel stuurt.

Als het ingevoerde wachtwoord te kort is, wordt dit blok weergegeven:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Als het wachtwoord is gedetecteerd op Have I Been Pwned, wordt deze blokkering weergegeven:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Als het wachtwoord geldig is, wordt u doorgestuurd naar de inlogpagina en kunt u nu met dit wachtwoord inloggen.
