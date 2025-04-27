# Documentazione passo-passo di be-BOP IT 🇮🇹

# 1. Installazione e Accesso Iniziale

**1.1. Installazione di be-BOP**

- **Prerequisiti:**

    1. **Infrastruttura Tecnica:**

        - **Archiviazione Compatibile S3:** Un servizio o soluzione (es. MinIO, AWS S3, Scaleway, ecc.) con configurazione del bucket (S3_BUCKET, S3_ENDPOINT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_REGION).

        - **Database MongoDB in ReplicaSet:** Un'istanza locale configurata come ReplicaSet o l'utilizzo di un servizio come MongoDB Atlas (variabili MONGODB_URL e MONGODB_DB).

        - **Ambiente Node.js:** Node versione 18 o superiore, con Corepack abilitato (`corepack enable`).

        - **Git LFS Installato:** Per gestire file di grandi dimensioni (comando `git lfs install`).

    2. **Configurazione delle Comunicazioni:**

        - **SMTP:** Credenziali SMTP valide (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) per l'invio di email e notifiche.

    3. **Sicurezza e Notifiche (almeno uno dei seguenti):**

        - **Email:** Un account email che consenta la configurazione SMTP per l'invio di notifiche.

        - **Chiave Nostr (nsec):** Una chiave NSEC (può essere generata da be-BOP tramite l'interfaccia Nostr).

    4. **Metodi di Pagamento Supportati:**

        - Almeno un metodo di pagamento supportato da be-BOP, come:

            - Bitcoin

            - Lightning Network

            - PayPal

            - SumUp

            - Stripe

            - I bonifici bancari e i pagamenti in contanti richiedono una validazione manuale.

    5. **Conoscenza del Regime IVA:**

        - È essenziale conoscere il regime IVA applicabile alla tua attività (es. vendite con IVA del paese del venditore, esenzione con giustificazione, o vendite con IVA del paese dell'acquirente) per configurare correttamente le opzioni di fatturazione e calcolo dell'IVA in be-BOP.

    6. **Configurazione delle Valute:**

        - Determinare chiaramente la valuta principale da utilizzare, la valuta secondaria (se applicabile) e, per un negozio al 100% in BTC, la valuta di riferimento per la contabilità.

    7. **Altri Prerequisiti Aziendali:**

        - Avere una chiara visione dei processi di ordinazione, gestione dell'inventario, politiche sulle spese di spedizione e metodi di pagamento e incasso, sia online che in negozio.

        - Conoscere gli obblighi legali (note legali, termini di utilizzo, politica sulla privacy) per la configurazione delle pagine CMS obbligatorie.

- **Installazione:** Distribuisci l'applicazione utilizzando lo script di installazione ufficiale sul tuo server e verifica che tutte le dipendenze siano correttamente installate.

**1.2. Creazione dell'Account Super-Admin**

- Vai su **/admin/login**.

- Crea il tuo account super-admin scegliendo un nome utente e una password sicuri. Preferisci una passphrase di tre o più parole.

- Questo account consentirà l'accesso a tutte le funzionalità del back-office.

---

# 2. Sicurezza e Configurazione del Back-Office

**2.1. Sicurezza dell'Accesso**

- **Configurazione dell'Hash di Accesso:**

    - Naviga su **/admin/config** tramite l'interfaccia di amministrazione.

    - Nella sezione dedicata alla sicurezza (es. “Admin hash”), imposta una stringa unica (hash).

    - Una volta salvato, l'URL del back-office cambierà (es. **/admin-tuo-hash/login**) per limitare l'accesso agli utenti autorizzati.

**2.2. Attivazione della Modalità di Manutenzione (se necessario)**

- In **/admin/config** (Config > Config tramite l'interfaccia grafica), seleziona l'opzione **Abilita modalità manutenzione** in fondo alla pagina.

- Facoltativamente, specifica un elenco di indirizzi IPv4 autorizzati (separati da virgole) per consentire l'accesso al front-office durante la manutenzione.

- Il back-office rimane accessibile agli amministratori.

**2.3. Configurazione degli Accessi di Recupero tramite Email o Nostr**

- In **/admin/config**, tramite il modulo ARM, assicurati che l'account super-admin includa un indirizzo email di recupero o un npub per facilitare il recupero della password.

**2.4. Configurazione della Lingua o delle Impostazioni Multilingue**

- In **Admin > Config > Languages**, abilita o disabilita il selettore di lingua a seconda che il tuo sito sia multilingue o monolingue (disabilitalo per un sito monolingue).

**2.5. Configurazione del Layout, Loghi e Favicon**

- In **Admin > Merch > Layout**, configura la barra superiore, la barra di navigazione e il footer.

    - Assicurati che l'opzione “Mostra powered by be-BOP” sia abilitata nel footer.

    - Imposta i loghi per i temi chiaro e scuro, oltre al favicon, tramite **Admin > Merch > Pictures**.

---

# 3. Configurazione dell'Identità del Venditore

**3.1. Impostazione dell'Identità**

- Vai su **/admin/identity** (Config > Identity tramite l'interfaccia grafica) per inserire tutte le informazioni relative alla tua azienda:

    - **Nome dell'azienda**, **indirizzo postale**, **email di contatto** utilizzata per l'invio delle fatture e per le comunicazioni ufficiali.

    - **Informazioni di fatturazione** (opzionali) che appariranno nell'angolo superiore destro delle fatture.

- **Conto Bancario:**

    - Per abilitare i pagamenti tramite bonifico bancario, fornisci il tuo IBAN e BIC.

**3.2. (Per Negozi Fisici) Visualizzazione dell'Indirizzo del Negozio**

- Per chi possiede un negozio fisico, duplica la configurazione precedente in **/admin/identity** (o in una sezione dedicata) aggiungendo l'indirizzo completo del negozio per visualizzarlo sui documenti ufficiali e nel footer, se applicabile.

---

# 4. Configurazione delle Valute

**4.1. Definizione delle Valute in /admin/config**

- **Valuta Principale:**

    - Questa valuta viene visualizzata nel front-office e sulle fatture.

- **Valuta Secondaria (opzionale):**

    - Può essere utilizzata per la visualizzazione o come alternativa.

- **Valuta di Riferimento per i Prezzi:**

    - Consente di fissare i prezzi in una valuta "stabile".

    - Nota: Fare clic sul pulsante di conferma ricalcolerà i prezzi di tutti i prodotti senza modificare gli importi inseriti.

- **Valuta di Contabilità:**

    - Utilizzata per tracciare i tassi di cambio in un be-BOP completamente basato su Bitcoin.

---

# 5. Configurazione dei Metodi di Pagamento

Puoi impostare la durata di un pagamento in sospeso nel pannello **Admin > Config**.

**5.1. Pagamenti Bitcoin e Lightning**

- **Bitcoin Nodeless (Onchain):**

    - In **Admin > Payment Settings > Bitcoin nodeless**, configura il modulo selezionando lo standard BIP (attualmente solo BIP84).

    - Inserisci la chiave pubblica (in formato **zpub**) generata con un portafoglio compatibile (es. Sparrow Wallet).

    - Non modificare l'indice di derivazione, che inizia da 0 e si incrementa automaticamente.

    - Configura l'URL di un esploratore di blocchi per verificare le transazioni (es. `https://mempool.space`).

- **PhoenixD per Lightning:**

    - Installa PhoenixD sul tuo server seguendo le istruzioni su [https://phoenix.acinq.co/server/get-started](https://phoenix.acinq.co/server/get-started).

    - In **Admin > Payment Settings > PhoenixD**, fornisci l'URL della tua istanza (se usi Docker, considera le specificità di rete) e aggiungi la password HTTP di PhoenixD. Se PhoenixD è installato sullo stesso server di be-BOP, fai clic sul pulsante **Rileva Server PhoenixD**.

**Per Utenti Avanzati**

È possibile utilizzare un nodo Bitcoin completo e LND tramite il file `.env` utilizzando le credenziali RPC (+TOR consigliato) per un nodo remoto. In alternativa, puoi installare Bitcoin Core e LND sulla stessa rete locale del tuo be-BOP.

- **Bitcoin Core:**

    - In **Admin > Payment Settings > Bitcoin core node**.

- **Lightning LND:**

    - In **Admin > Payment Settings > Lightning LND node**.

**5.2. Pagamento PayPal**

- In **Admin > Payment Settings > PayPal**, inserisci il tuo Client ID e Secret ottenuti dal tuo account sviluppatore PayPal su [https://developer.paypal.com/api/rest/](https://developer.paypal.com/api/rest/).

- Seleziona **Queste credenziali sono per l'ambiente sandbox** se desideri utilizzare la modalità Sandbox (per test) o lascia deselezionato per la modalità produzione.

**5.3. Pagamento SumUp**

- In **Admin > Payment Settings > SumUp**, inserisci la tua API Key e il Merchant Code su [https://developer.sumup.com/api](https://developer.sumup.com/api).

- La valuta utilizzata corrisponde alla valuta del tuo account SumUp (generalmente quella del paese della tua azienda).

**5.4. Pagamento Stripe**

- In **Admin > Payment Settings > Stripe**, inserisci la tua Secret Key e Public Key su [https://docs.stripe.com/api](https://docs.stripe.com/api).

- La valuta utilizzata corrisponde alla valuta del tuo account Stripe (generalmente quella del paese della tua azienda).

---

# 6. Gestione dei Prodotti

**6.1. Creazione di un Nuovo Prodotto**

- Vai su **Admin > Merch > Products** per aggiungere o modificare un prodotto.

- **Informazioni di Base:**

    - Inserisci il **Nome del prodotto**, lo **slug** (identificativo unico per l'URL) e, se necessario, un **alias** per semplificare l'aggiunta tramite il campo dedicato nel carrello. Per i prodotti venduti online (non Point of Sale), un alias non è richiesto.

- **Prezzi:**

    - Imposta il prezzo in **Price Amount** e seleziona la valuta in **Price Currency**. Puoi anche creare prodotti gratuiti o a prezzo libero selezionando rispettivamente le opzioni **Questo è un prodotto gratuito** e **Questo è un prodotto a prezzo libero**.

    - **Opzioni del Prodotto:**

        - Indica se il prodotto è standalone (aggiunta singola per ordine) o ha variazioni (es. una t-shirt in S, M, L, XL non è standalone).

        - Per i prodotti con variazioni, abilita l'opzione **Il prodotto ha variazioni leggere (nessuna differenza di stock)** e aggiungi le variazioni (nome, valore e differenza di prezzo).

**6.2. Gestione dell'Inventario**

- Per i prodotti con stock limitato, seleziona **Il prodotto ha uno stock limitato** e inserisci la quantità disponibile.

- Il sistema mostra anche lo stock riservato (negli ordini in sospeso) e lo stock venduto.

- Puoi regolare la durata (in minuti) per cui un prodotto è considerato riservato in un carrello in sospeso in **Admin > Config**.

---

# 7. Creazione e Personalizzazione delle Pagine CMS e dei Widget

**7.1. Pagine CMS Obbligatorie**

- Crea pagine essenziali in **Admin > Merch > CMS**, come:

    - `/home` (homepage),

    - `/error` (pagina di errore),

    - `/maintenance` (pagina di manutenzione),

    - `/terms`, `/privacy`, `/why-vat-customs`, `/why-collect-ip`, `/why-pay-reminder` (pagine legali e informative obbligatorie).

- Queste pagine forniscono ai visitatori informazioni legali, dettagli di contatto e spiegazioni sul funzionamento del tuo negozio.

- Puoi aggiungere tutte le pagine aggiuntive necessarie.

**7.2. Layout ed Elementi Grafici**

- Vai su **Admin > Merch > Layout** per personalizzare la barra superiore, la barra di navigazione e il footer.

- Modifica i link, i loghi (tramite **Admin > Merch > Pictures**) e la descrizione del tuo sito.

**7.3. Integrazione dei Widget nelle Pagine CMS**

- Crea vari widget in **Admin > Widgets**, come Challenges, Tags, Sliders, Specifications, Forms, Countdowns, Galleries e Leaderboards.

- Usa tag specifici per integrare elementi dinamici, ad esempio:

    - Per visualizzare un prodotto: `[Product=slug?display=img-1]`

    - Per visualizzare un'immagine: `[Picture=slug width=100 height=100 fit=contain]`

    - Per integrare uno slider: `[Slider=slug?autoplay=3000]`

    - Per aggiungere una sfida, un conto alla rovescia, un modulo, ecc., usa rispettivamente `[Challenge=slug]`, `[Countdown=slug]`, `[Form=slug]`.

---

# 8. Gestione degli Ordini e Reportistica

**8.1. Tracciamento degli Ordini**

- In **Admin > Transaction > Orders**, visualizza l'elenco degli ordini.

- Usa i filtri disponibili (Numero Ordine, Alias Prodotto, Metodo di Pagamento, Email, ecc.) per affinare la ricerca.

- Puoi visualizzare i dettagli di un ordine (prodotti ordinati, informazioni sul cliente, indirizzo di spedizione) e gestire lo stato dell'ordine (conferma, annulla, aggiungi etichette, visualizza note sull'ordine).

**8.2. Reportistica ed Esportazione**

- Vai su **Admin > Config > Reporting** per visualizzare statistiche mensili e annuali su ordini, prodotti e pagamenti.

- Ogni sezione (Dettaglio Ordine, Dettaglio Prodotto, Dettaglio Pagamento) include un pulsante **Esporta CSV** per scaricare i dati.

---

# 9. Configurazione della Messaggistica Nostr (Opzionale)

**9.1. Configurazione della Chiave Nostr**

- In **Admin > Node Management > Nostr**, fai clic su **Crea una nsec** se non ne possiedi già una.  
    **NOTA:** Se hai già generato e configurato la tua nsec tramite un client Nostr e l'hai aggiunta al tuo file `.env`, salta questo passaggio.

- Copia la chiave NSEC generata da te o da be-BOP e aggiungila al tuo file **.env.local** sotto la variabile `NOSTR_PRIVATE_KEY`.

**9.2. Funzionalità Associate**

- Questa configurazione consente l'invio di notifiche tramite Nostr, l'attivazione del client amministrativo leggero e l'offerta di accessi senza password tramite link temporanei.

---

# 10. Personalizzazione del Design e dei Temi

- In **Admin > Merch > Theme**, crea un tema definendo colori, font e stili per l'intestazione, il corpo, il footer, ecc.

- Una volta creato, applicalo come tema attivo per il tuo negozio.

---

# 11. Configurazione dei Modelli di Email

- Vai su **Admin > Config > Templates** per configurare i modelli di email (es. per il ripristino della password, le notifiche degli ordini, ecc.).

- Per ogni modello, fornisci l'**Oggetto** e il **Corpo HTML**.

- I modelli supportano variabili come `{{orderNumber}}`, `{{invoiceLink}}`, `{{websiteLink}}`, ecc.

---

# Per Utenti Avanzati...

# 12. Configurazione dei Tag e dei Widget Specifici

**12.1. Gestione dei Tag**

- In **Admin > Widgets > Tag**, crea tag per organizzare i prodotti o arricchire le pagine CMS.

- Fornisci il **Nome del tag**, lo **slug**, seleziona la **Famiglia di Tag** (Creators, Retailers, Temporal, Events) e completa i campi facoltativi (titolo, sottotitolo, contenuto breve e completo, CTAs).

**12.2. Integrazione tramite CMS**

- Per integrare un tag in una pagina, usa la sintassi:  
    `[Tag=slug?display=var-1]`

# 13. Configurazione dei File Scaricabili

**Aggiunta di un File**

- In **Admin > Merch > Files**, fai clic su **Nuovo file**.

- Fornisci il **nome del file** (es. “Manuale del prodotto”) e carica il file tramite il pulsante **Sfoglia…**.

- Una volta aggiunto, viene generato un link permanente che può essere utilizzato nelle pagine CMS per condividere il file.

# 14. Nostr-Bot

Nella sezione **Node Management > Nostr**, puoi configurare la tua interfaccia Nostr per inviare notifiche e interagire con i clienti. Le opzioni disponibili includono:

- Gestione dell'elenco dei relè utilizzati dal tuo bot Nostr.

- Abilitazione o disabilitazione del messaggio di presentazione automatico inviato dal bot.

- Certificazione del tuo npub associandolo a un logo, un nome e un dominio (alias Lightning BOLT12 per gli Zaps).

# 15. Sovrascrittura delle Etichette di Traduzione

Sebbene be-BOP sia disponibile in più lingue (inglese, francese, spagnolo, ecc.), puoi personalizzare le traduzioni per adattarle alle tue esigenze. Vai su **Config > Languages** per caricare e modificare i file JSON di traduzione. Questi file per ogni lingua sono disponibili nel nostro repository ufficiale all'indirizzo:  
[https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations](https://github.com/be-BOP-io-SA/be-BOP/tree/main/src/lib/translations)

---

# PARTE 2: Lavoro di Squadra e POS

# 1. Gestione degli Utenti e dei Diritti di Accesso

**1.1. Creazione dei Ruoli**

- In **Admin > Config > ARM**, fai clic su **Crea un ruolo** per definire i ruoli (es. Super Admin, Point of Sale, Ticket Checker).

- Per ogni ruolo, specifica:

    - I percorsi per l'**accesso in scrittura** e l'**accesso in lettura**.

    - I percorsi vietati tramite **Accesso vietato**.

**1.2. Gestione degli Utenti**

- In **Admin > Users**, crea o modifica gli utenti fornendo:

    - Il **login**, l'**alias**, l'**email di recupero** e, se applicabile, il **Recovery npub**.

    - Assegna il ruolo appropriato a ogni utente.

- Gli utenti con accesso in sola lettura vedranno i menu in corsivo e non potranno apportare modifiche.

# 2. Configurazione del Punto Vendita (POS) per le Vendite in Negozio

**2.1. Assegnazione e Accesso al POS**

- Assegna il ruolo **Point of Sale (POS)** tramite **Admin > Config > ARM** all'utente che gestisce la cassa.

- Gli utenti POS accedono tramite la pagina di identificazione sicura e vengono reindirizzati all'interfaccia dedicata (es. **/pos** o **/pos/touch**).

**2.2. Funzionalità Specifiche del POS**

- **Aggiunta Rapida tramite Alias:** In **/cart**, il campo alias consente di scansionare un codice a barre (ISBN, EAN13) per aggiungere direttamente il prodotto.

- **Opzioni di Pagamento POS:**

    - Supporto per pagamenti multi-modalità (contanti, carta, Lightning, ecc.).

    - Opzioni per l'esenzione IVA o sconti regalo con giustificazione manageriale obbligatoria.

- **Visualizzazione Lato Cliente:**

    - Su uno schermo dedicato (es. tablet o monitor esterno tramite HDMI), visualizza la pagina **/pos/session** per consentire ai clienti di seguire l'avanzamento del loro ordine.