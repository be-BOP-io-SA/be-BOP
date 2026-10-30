# Back-Office-Zugang

Personen mit einem be-BOP-Mitarbeiterkonto und der Super-Admin können sich über /admin im Back-Office anmelden.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## Erstanmeldung und sicherer Zugang

Da die URL /admin zu offensichtlich ist, kann der be-BOP-Besitzer eine spezielle Zeichenkette konfigurieren, um den Zugang zum Back-Office abzusichern.

Gehen Sie dazu bei der Erstellung von be-BOP zu /admin/config und dann zu diesem Bereich:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Sobald dies erledigt ist, ist der Zugang über die URL /admin-konfiguriertezeichenkette/login möglich.

Der Zugriff auf eine falsche Admin-URL leitet auf diese Seite um:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

Ein Mitarbeiter mit Lese-/Schreibzugriff auf /admin/arm kann Ihnen einen Link zum Zurücksetzen des Passworts senden, der die URL einschließlich /admins-secret enthält.

Wenn ein Benutzer angemeldet ist, leitet die URL /admin automatisch zum korrekten Link um.

## Mitarbeiter-Anmeldung

Das Mitarbeiter-Anmeldeformular befindet sich unter /admin-secret/login

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

Sie können das anfängliche Sitzungs-Timeout bei der Verbindung verlängern:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

Sie haben dann Zugang zum Admin-Bereich, abhängig von den Ihrem Profil zugewiesenen Rechten:
- Wenn Sie Lese-/Schreibrechte haben, ist der Untermenü-Link normal dargestellt
- Wenn Sie nur Leserechte haben, ist der Untermenü-Link kursiv dargestellt (jede Aktion auf der Seite wird abgelehnt)
- Wenn Sie keine Leserechte haben, wird der Untermenü-Link ausgeblendet, und ein Versuch, ihn über eine direkte URL aufzurufen, leitet Sie zur Admin-Startseite zurück.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Passwortsicherheit

Bei der Mitarbeiteranmeldung wird Ihr Passwort überprüft.
Die ersten und letzten verschlüsselten Zeichen Ihres Passwort-Strings werden an [Have I Been Pwned](https://haveibeenpwned.com/) gesendet, das eine Reihe vollständiger Strings zurückgibt.
be-BOP prüft dann lokal, ob Ihr Passwort in dieser Liste enthalten ist (damit es nicht direkt an Have I Been Pwned übermittelt wird).
Falls das Passwort vorhanden ist, werden Sie mit dieser Sicherheitsmeldung blockiert und aufgefordert, Ihr Passwort zu ändern:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Abmelden aus dem Back-Office

Sie können sich abmelden, indem Sie auf das rote Symbol neben der Bezeichnung "Admin" in der Kopfzeile klicken.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

Sie werden dann zur Anmeldeseite zurückgeleitet.

## Passwort-Wiederherstellung

Wenn Sie Ihr Passwort verlieren, können Sie zu /admin-secret/login gehen und auf "Recovery" klicken:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

Sie werden dann aufgefordert, Ihren Benutzernamen einzugeben.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

Wenn Sie die falsche Kennung eingeben, werden Sie benachrichtigt und können es mit einer anderen erneut versuchen. Falls Sie Ihre Kennung nicht finden können, müssen Sie den be-BOP-Administrator bitten, Ihnen die Informationen erneut mitzuteilen.

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

Im Falle eines Missbrauchs durch einen Mitarbeiter wird ein Schutz ausgelöst:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

Falls der Benutzername existiert, wird diese Nachricht an die mit dem Konto verknüpfte Kontaktadresse gesendet (E-Mail, npub oder beides):

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Die Verwendung eines abgelaufenen oder bereits verwendeten Links führt zu einer Fehlerseite:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

Dieser Link enthält ein Einmal-Token, das Sie zur Seite zum Zurücksetzen des Passworts weiterleitet.

Wenn das eingegebene Passwort zu kurz ist, wird dieser Hinweis angezeigt:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

Wenn das Passwort bei Have I Been Pwned erkannt wird, wird diese Sperre angezeigt:

![image](https://github.com/be-BOP-io-SA/be-BOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

Wenn das Passwort gültig ist, werden Sie zur Anmeldeseite weitergeleitet und können sich damit anmelden.
