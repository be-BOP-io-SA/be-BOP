# Einführung

Diese Dokumentation soll be-BOP-Besitzern helfen, den automatischen E-Mail-Versand auf die einfachste und kostengünstigste Weise zu konfigurieren, die bisher gefunden wurde.

Bisher getestete E-Mail-Anbieter, die funktionieren:
- Outlook.fr
- (weitere folgen)

Anbieter, die nicht funktionieren (DMARC-Einschränkung):
- GMail
- Protonmail
- (weitere folgen)

Testen Sie gerne und teilen Sie uns mit, ob Ihr E-Mail-Anbieter funktioniert oder nicht unter contact@be-bop.io

# Vorwort

Es war einmal eine wunderbare Zeit, in der Besitzer interaktiver Websites oder Online-Shops frei und kostenlos automatische E-Mails versenden konnten.
Es war die Zeit, in der kostenlose E-Mail-Anbieter die Nutzung eines E-Mail-Postfachs durch eine Drittanwendung problemlos erlaubten.
Es war die Zeit, in der transaktionales SMTP erlaubt und kostenlos war.
Es war die Zeit, in der die Menschen glücklich waren.
Es war die Zeit.
Aber dann beschloss eines Tages die Paywall-Nation anzugreifen...

Heutzutage ist transaktionales SMTP, wenn nicht strikt verboten, an ein SMTP-Token gebunden, das nur in einem kostenpflichtigen Business-Plan angeboten wird, oder hängt von einem auf Massen-E-Mail-Versand spezialisierten Drittanbieter ab, der umfangreiche DNS-Zonenkonfigurationen erfordert, die normale Benutzer ausschließen, die dann auf teure Webagenturen zurückgreifen müssen, um einen zunächst kostenlosen, aber schnell kostenpflichtigen Service zu konfigurieren.
Diese Menschen, die möglicherweise nur etwa ein Dutzend Online-Bestellungen pro Monat benachrichtigen müssen, waren dann hilflos...
Ihre einzigen verbleibenden Möglichkeiten waren:
- einen kostenpflichtigen E-Mail-Dienst abonnieren
- bestimmte Domain-Anbieter abonnieren, die auch E-Mail anbieten
- komplexe Drittanbieter nutzen, die technische Unterstützung oder erhebliche Einarbeitungszeit erfordern
- auf E-Mail-Benachrichtigungen verzichten und von ihren ersten Kunden wegen dieses Mangels abgelehnt werden

...und dann kam das be-BOP-Team mit smtp2go.

# Beschreibung

smtp2go ist eine Cloud-E-Mail-Zustellungsplattform, die das Senden und Verfolgen von E-Mails ermöglicht.
Obwohl die Nutzung eines Drittanbieters nicht ideal ist, ist es der beste Kompromiss, der bisher für Personen gefunden wurde, die kein E-Mail-Konto haben, das transaktionales SMTP autorisiert.
Durch die Verknüpfung von smtp2go mit einer bestehenden E-Mail-Adresse und einer einfachen technischen Überprüfung des E-Mail-Kontos ermöglicht smtp2go be-BOP den Versand von bis zu 1.000 E-Mails/Monat im kostenlosen Plan.

# Vorgehensweise

- Erstellen Sie eine erreichbare E-Mail-Adresse (oder halten Sie eine bereit), die die von be-BOP an Besucher, Kunden und Mitarbeiter gesendeten E-Mails empfangen wird.
- Gehen Sie zu https://smtp2go.com
- Klicken Sie auf "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Geben Sie Ihre E-Mail-Adresse ein (die von be-BOP verwendet wird oder Ihre eigene — sie können unterschiedlich sein)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Geben Sie Ihre Identitäts- und Geschäftsinformationen ein (das Passwort wird nur einmal abgefragt, überprüfen Sie Ihre Eingabe)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- Sie werden aufgefordert, Ihre E-Mail-Adresse zu bestätigen:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Öffnen Sie Ihr Postfach, öffnen Sie die SMTP2GO-Nachricht und klicken Sie auf den Bestätigungslink im Nachrichtentext
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Ihr Konto wird nun aktiviert
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Überprüfen Sie dann den Absender (grüne Schaltfläche "Add a verified sender") und wählen Sie die richtige Option "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Geben Sie die E-Mail-Adresse ein, die von be-BOP verwendet wird, und senden Sie das Formular ab
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- Wenn Ihr E-Mail-Anbieter die Option nicht blockiert, sehen Sie diese Anzeige:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
Sie erhalten auch diese Nachricht per E-Mail: Sie müssen sie durch Klicken auf die Schaltfläche "Verify email@domain.com" bestätigen
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
Wenn Sie jedoch die folgende Meldung sehen, bedeutet dies, dass Ihr E-Mail-Anbieter die Verknüpfung ablehnt (wahrscheinlich weil er transaktionales SMTP als kostenpflichtigen Dienst oder unter anderen Bedingungen anbietet):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Sobald die Bestätigungs-E-Mail validiert ist, sollte Ihr Absender so angezeigt werden:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- Gehen Sie im linken Menü zu "SMTP Users" und klicken Sie dann auf "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Klicken Sie auf "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO füllt das Formular mit einem SMTP-Benutzer vor, dessen Standard-Benutzername die Domain Ihrer Absender-E-Mail-Adresse ist. Sie können es so lassen oder aus Sicherheitsgründen anpassen (und da die Kennung auf SMTP2GO einzigartig sein muss, wird eine zu einfache Kennung bereits vergeben und abgelehnt). Bestätigen Sie dann durch Klicken auf die Schaltfläche "Add SMTP User".
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- Sie können dann be-BOP mit den folgenden Informationen konfigurieren und neu starten:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=der_auf_smtp2go_gewählte_benutzername
SMTP_PASSWORD=das_auf_smtp2go_gewählte_passwort
```

# Überprüfen Sie Ihre Konfiguration

Um Probleme beim E-Mail-Versand zu vermeiden, stellen Sie sicher, dass die Absender-E-Mail-Adresse dieselbe ist wie die im be-BOP-Back-Office konfigurierte, unter Admin > Config > Identity, bei "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Haftungsausschluss

- Über 1.000 gesendete E-Mails pro Monat hinaus funktioniert der E-Mail-Versand nicht mehr, und SMTP2GO sendet Ihnen eine Aufforderung zum Upgrade auf einen kostenpflichtigen Plan
- Die be-BOP-Software ist in keiner Weise mit dem SMTP2GO-Dienst verbunden oder assoziiert
- be-bop.io ist in keiner Weise mit smtp2go.com verbunden oder assoziiert
- be-BOP.io SA ist in keiner Weise mit SMTP2GO verbunden oder assoziiert
- Das be-BOP-Team bietet keinen SMTP2GO-Support an
- Das be-BOP-Team stellt diese Dokumentation nur zur Verfügung, um seinen Benutzern zu helfen und ihnen den Rückgriff auf kostenpflichtige oder komplexe Dienste zu ersparen

Nieder mit Paywalls ✊
