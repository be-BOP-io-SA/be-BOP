# Introductie

Deze documentatie is bedoeld om eigenaren van een be-BOP in staat te stellen het automatisch verzenden van e-mails te configureren op de eenvoudigste en gratis manier die is gevonden.

De tot nu toe geteste e-mailproviders die werken zijn:
- Outlook.fr
- (wordt vervolgd)

Degene die niet werken (DMARC-restrictie) zijn:
- GMail
- Protonmail
- (wordt vervolgd)

Aarzel niet om te testen en ons te laten weten of uw e-mailproviders al dan niet werken via contact@be-bop.io

# Voorwoord

Er was eens een prachtige tijd waarin eigenaars van een interactieve website of webshop vrijelijk automatische e-mails gratis konden versturen.
Het was de tijd dat gratis e-mailproviders het gebruik van een e-mailbox door een externe applicatie gemakkelijk toestonden.
Het was de tijd dat transactionele SMTP toegestaan en gratis was.
Het was de tijd dat mensen gelukkig waren.
Het was de tijd.
Maar op een dag besloot de natie van de Paywall aan te vallen...

Tegenwoordig is transactionele SMTP, wanneer het niet strikt verboden is, onderworpen aan een SMTP-token dat alleen beschikbaar is in een betaald zakelijk abonnement, of is afhankelijk van een gespecialiseerde derde partij voor het verzenden van massa-e-mails, met veel DNS-zone-instellingen die de gemiddelde gebruiker buitensluiten, die nu een beroep moeten doen op dure webbureaus om een aanvankelijk gratis maar snel betalende dienst in te stellen.
Deze mensen, die misschien maar een tiental online bestellingen per maand hoeven te melden, waren toen radeloos...
De enige overgebleven keuzes waren:
- een abonnement op een betaalde e-maildienst
- een abonnement bij bepaalde specifieke domeinproviders die ook e-mails aanbieden
- het gebruik van complexe derde partijen die technische assistentie of aanzienlijke leertijd vereisen
- het opgeven van e-mailnotificaties en de afwijzing door hun eerste klanten als gevolg van dit tekort

...en toen kwam het be-BOP-team met smtp2go.

# Beschrijving

smtp2go is een cloud-platform voor e-mailverzending waarmee u e-mails kunt verzenden en volgen.
Hoewel het gebruik van een derde partij niet ideaal is, is het het beste compromis dat tot nu toe is gevonden voor mensen die geen e-mailaccount hebben dat transactionele SMTP toestaat.
Via de koppeling van smtp2go met een bestaand e-mailadres en een eenvoudige technische verificatie van het e-mailaccount, stelt smtp2go be-BOP in staat om e-mails te verzenden met een limiet van 1000 per maand in het gratis abonnement.

# Procedure

- Maak een raadpleegbaar e-mailadres aan (of heb er een beschikbaar) dat de ontvanger zal zijn van e-mails die door be-BOP worden verzonden aan bezoekers, klanten en werknemers.
- Ga naar https://smtp2go.com
- Klik op "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Voer uw e-mailadres in (het adres dat door be-BOP zal worden gebruikt of uw eigen adres; ze kunnen verschillend zijn)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Voer uw identiteits- en bedrijfsgegevens in (het wachtwoord wordt slechts eenmaal gevraagd, controleer uw invoer goed)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- U wordt gevraagd uw e-mailadres te valideren:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Ga naar uw e-mail, open het bericht van SMTP2GO en klik op de bevestigingslink in de berichttekst
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Uw account wordt nu geactiveerd
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Verifieer vervolgens de afzender (groene knop "Add a verified sender") en kies de optie rechts "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Voer het e-mailadres in dat door be-BOP zal worden gebruikt en valideer het formulier
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Als uw e-mailprovider de optie niet blokkeert, ziet u dit scherm:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
U ontvangt ook dit bericht per e-mail: u moet het valideren door op de knop "Verify email@domain.com" te klikken
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
Als u daarentegen het volgende bericht ontvangt, weigert uw e-mailprovider de koppeling (waarschijnlijk omdat deze de betaalde transactionele SMTP-dienst aanbiedt of onder andere voorwaarden):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Zodra de verificatie-e-mail is gevalideerd, zou uw afzender als volgt moeten worden weergegeven:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- Ga in het linkermenu naar "SMTP Users" en klik op "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Klik op "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO vult het formulier vooraf in met een SMTP-gebruiker waarvan de standaard Username het domein van uw verzend-e-mailadres is. U kunt het zo laten, of het aanpassen om veiligheidsredenen (en omdat de identificatie uniek moet zijn op SMTP2GO, wordt een te eenvoudige identificatie al gebruikt en geweigerd). Valideer vervolgens door op de knop "Add SMTP User" te klikken.
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- U kunt vervolgens be-BOP configureren met de volgende informatie en herstarten:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=de_gekozen_gebruikersnaam_op_smtp2go
SMTP_PASSWORD=het_gekozen_wachtwoord_op_smtp2go
```

# Let op uw configuratie

Om problemen met het verzenden van berichten te voorkomen, zorg ervoor dat het verzend-e-mailadres hetzelfde is als het adres dat is geconfigureerd in de be-BOP backoffice, in Admin > Config > Identity, gedeelte "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Waarschuwing

- Na meer dan 1000 verzonden e-mails per maand werkt het verzenden van e-mails niet meer, en SMTP2GO stuurt u een verzoek om over te stappen op een betaald abonnement
- De be-BOP-software is op geen enkele manier geassocieerd met of geaffilieerd aan de SMTP2GO-dienst
- be-bop.io is op geen enkele manier geassocieerd met of geaffilieerd aan smtp2go.com
- be-BOP.io SA is op geen enkele manier geassocieerd met of geaffilieerd aan SMTP2GO
- Het be-BOP-team biedt geen ondersteuning voor SMTP2GO
- Het be-BOP-team levert uitsluitend deze documentatie om hun gebruikers te helpen en te voorkomen dat ze betaalde of complexe diensten moeten gebruiken

Weg met paywalls!
