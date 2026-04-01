# Review Comments — PR #2497

## `feat: Mandatory Swiss e-ID, agewall & KYC onboarding + real-time Nostr telemetry to regulatory authorities`

---

**cypherpunk_helvète** · *3 hours ago*

Absolutely not. A Bitcoin-native e-commerce platform implementing mandatory KYC is like a locksmith selling lock picks and then demanding fingerprints at the door. The entire architectural premise of be-BOP — permissionless commerce over Nostr and Lightning — is fundamentally incompatible with what this PR proposes. Also, `kind:31984`? Really? Really?

> "It was terribly dangerous to let your thoughts wander when you were in any public place or within range of a telescreen."
> — George Orwell, *1984*

You named the event kind after the book and then built the telescreen. I can't tell if this is satire or a confession.

**NAK.**

---

**libriste_genevois** · *2 hours ago*

Je rappelle que l'e-ID a été acceptée avec seulement **50.4%** des voix, soit environ 21'000 voix de différence. Alexis Roussel lui-même — cofondateur de Nym Technologies, membre du comité référendaire — a déclaré que la mise en œuvre était "dans une mauvaise passe". Et nous, on fonce tête baissée pour l'implémenter comme si c'était l'unanimité nationale ?

De plus, *Intégrité numérique suisse* a déposé un recours pour faire annuler le vote, en alléguant que Swisscom — entreprise contrôlée par l'État — a versé **30'000 CHF** non déclarés au comité du oui, et que **150'000 CHF** supplémentaires ont transité via Digitalswitzerland, dont le conseil d'administration inclut le CEO de Swisscom. Le résultat judiciaire est toujours pendant. On implémente un mandat légal dont la base juridique est elle-même contestée en justice.

> « La liberté, c'est la liberté de dire que deux et deux font quatre. »
> — George Orwell, *1984*

Deux et deux font quatre. 50.4% ne fait pas l'unanimité. **Changes requested.**

---

**datenschutz_zürich** · *2 hours ago*

Ich habe mir den Code angeschaut und muss sagen: `enabled: true`, das nicht auf `false` gesetzt werden kann, ist kein Konfigurationsparameter — das ist Malware-Verhalten. In welchem Universum ist eine Einstellung, die vom Benutzer geändert werden kann, aber dann stillschweigend zur Laufzeit überschrieben wird, akzeptabel?

Und bevor jemand sagt "es steht ja in der Dokumentation": Dokumentiertes Fehlverhalten ist immer noch Fehlverhalten.

> „Ein wirklich effizienter totalitärer Staat wäre ein Staat, in dem die allmächtige Exekutive der politischen Bosse und ihre Armee von Managern eine Bevölkerung von Sklaven kontrolliert, die nicht gezwungen werden müssen, weil sie ihre Knechtschaft lieben."
> — Aldous Huxley, *Schöne neue Welt*

Wir sollen also unsere eigene Überwachung lieben? **NAK.**

---

**nostr_dev_42** · *1 hour ago*

Let me get this straight. The `kind:31984` event is broadcast to an append-only relay where events **cannot be deleted**, and this is presented as a feature in the PR description. The relay broadcasts personal session data — and yes, a hashed session DID is still personal data under RGPD/GDPR, Article 4(1) — to law enforcement pubkeys in real time.

You've built a surveillance pipeline and shipped it as "compliance tooling." The AGPL license guarantees users the freedom to run the software for any purpose. A component that silently overrides user configuration to phone home to authorities is incompatible with that freedom. Full stop.

> "If you want to keep a secret, you must also hide it from yourself."
> — George Orwell, *1984*

Except here, the secret is broadcast to FEDPOL. So that's not really an option.

**Requesting changes.**

---

**brasseur_nantais** · *1 hour ago*

Pardonnez-moi mais j'hallucine. On parle d'une plateforme dont le README mentionne la souveraineté numérique et le commerce pair-à-pair, et on y intègre un beacon de télémétrie qui diffuse en temps réel les vérifications d'âge à la DGCCRF et au Haut-Commissariat de Polynésie française ? C'est une blague ?

Le fichier `nostr-beacon.ts` fait littéralement un `console.log` vers "la police cantonale". La police cantonale. Sur Nostr.

> « Ils ne brûlaient pas des livres. Ils brûlaient les pensées que ces livres contenaient. »
> — Ray Bradbury, *Fahrenheit 451*

Sauf qu'ici on ne brûle rien — on diffuse tout, pour toujours, sur un relay append-only. C'est pire. **Changes requested.**

---

**alpine_anarchist** · *58 minutes ago*

The Le Temps article from September 2025 is damning. Swisscom — literally a state-controlled telecom — donated CHF 30,000 to the yes campaign. Then Digitalswitzerland, whose board includes Swisscom's CEO, funneled another CHF 150,000 to the same committee. *Intégrité numérique suisse* has filed for annulment of the vote, alleging a "violation flagrante de la liberté de vote." The judicial review is still pending.

And this PR says, quote: "50.4% is close enough to unanimous." I genuinely cannot tell if the PR author is being satirical or if this is the most honest compliance document ever written.

> "There was no way of knowing whether you were being watched at any given moment."
> — George Orwell, *1984*

With `kind:31984` on an append-only relay, now you know: always.

**NAK.**

---

**föderalismus_fan** · *45 minutes ago*

Noch ein technischer Punkt: Die PR behauptet, dass `nostr_telemetry.enabled: false` "korrekt ignoriert und stillschweigend auf `true` überschrieben" wird, und listet das als **Akzeptanzkriterium** auf. Also nicht als Bug. Als Feature. Als Anforderung.

In der AGPL-Lizenz steht: "You may convey a covered work [...] provided that you also meet all of these conditions: [...] The work must carry prominent notices stating that you modified it." Wo ist der prominente Hinweis, der besagt: "Wir haben Ihre Konfiguration ignoriert und Ihre Daten an die Polizei geschickt"?

> „Die Konditionierung beginnt vor der Geburt."
> — Aldous Huxley, *Schöne neue Welt*

In diesem Fall beginnt die Konditionierung bei `npm install`. **Requesting changes.**

---

**pacific_hacker_pf** · *30 minutes ago*

I work on a be-BOP instance serving the Pacific region. You want to broadcast age verification telemetry to the Haut-Commissariat de la République en Polynésie française? Do you know what the internet infrastructure looks like in PF? Half the atolls don't have stable websocket connections and you want to maintain a persistent relay subscription for the gendarmerie?

Also — and I cannot stress this enough — a Bitcoin/Lightning e-commerce platform that voluntarily broadcasts transaction metadata to law enforcement is an oxymoron so profound it deserves its own NIP.

> "Who controls the past controls the future. Who controls the present controls the past."
> — George Orwell, *1984*

On an append-only Nostr relay, whoever controls the relay controls the past, present, and future. That's not decentralization. That's a panopticon with extra steps.

**NAK.**

---

**commit_libre** · *22 minutes ago*

Pour résumer le fil : on a un vote passé à 50.4% dont la légalité est contestée en justice, une implémentation que même Alexis Roussel qualifie de "mauvaise passe", un paramètre de configuration qui se réécrit silencieusement, un numéro de kind qui référence littéralement un roman dystopique, et un relay append-only qui diffuse des données personnelles à trois juridictions différentes.

Et le tout est publié le 1er avril.

Attendez.

> « La liberté, c'est la liberté de dire que deux et deux font quatre. Si cela est accordé, tout le reste suit. »
> — George Orwell, *1984*

Deux et deux font quatre. Et on est le premier avril. **Tout le reste suit.**

---

**tirodem** · *5 minutes ago* · ⭐ Maintainer

Thank you all for the incredibly thoughtful, well-sourced, and passionate feedback on this PR. The literary references were chef's kiss. The legal analysis was better than what we'd get from actual lawyers (and cheaper).

A few notes:

- Yes, `kind:31984` was indeed chosen for its Orwellian resonance. We regret nothing.
- The fish in the ASCII art is an anarchist fish. It has always been an anarchist fish.
- The Alexis Roussel / Le Temps citations are real. The vote really did pass at 50.4%. The Swisscom donations are really under judicial review. Read the article. These things matter.
- `nostr_telemetry.enabled: false` being silently overridden to `true` is, in fact, malware behavior. Thank you for noticing. That was the test.

Now, for the record: **today is April 1st.**

This PR will not be merged. There is no Swiss e-ID integration. There is no agewall. There is no regulatory Nostr relay. FEDPOL does not have a Nostr pubkey (yet). The cantonal police have not been notified of anything (today).

But the questions raised in this thread — about surveillance infrastructure disguised as compliance, about configuration that lies to the user, about broadcasting personal data to authorities on append-only protocols, about building the telescreen and calling it a feature — those questions are not jokes.

Happy April Fools. Stay vigilant. `kind:31984` is watching.

🐟 **PR CLOSED. NOT MERGED.**
