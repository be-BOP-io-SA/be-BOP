# Documentazione Widget Tag

Accessibile tramite **Admin** > **Widgets** > **Tag**, i tag sono:

- Un modo per gestire creatori/marchi/categorie senza un sistema pesante di gestione categorie/marchi/produttori.
- Un modo per arricchire e aggiungere profondità alle pagine web be-BOP con contenuti sia statici che dinamici nelle pagine CMS.
- Un modo per dare a partner e venditori i mezzi per avere un catalogo bello e completo, ricco di contesto intorno ai prodotti, dove le categorie pseudo-dinamiche non sono solo un elenco di prodotti.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Famiglia di Tag

I tag sono classificati in 4 famiglie per facilitare l'organizzazione.

- Creators: per i tag dei creatori
- Retailers: per i tag relativi a un negozio
- Temporal: per i tag temporali
- Events: per i tag degli eventi

## Tag Speciali

Esiste un tag speciale `pos-favorite`, vedi [pos-touch-screen.md].

## Aggiungere un Tag

Per aggiungere un tag, fare clic su **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

L'interfaccia **"Add a tag"** consente agli utenti di aggiungere un nuovo tag con informazioni specifiche, come nome, slug, famiglia, titolo, sottotitolo...

### Campi del Formulario

- **Tag name**: Il nome che identifica il tag.
- **Slug**: Identificatore univoco utilizzato nell'URL, per l'integrazione CMS... Generato automaticamente dal nome.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Opzioni**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only**: Solo per integrazione CMS, non può essere utilizzato come categoria.
  [ ] **Available for product tagging**: Disponibile per categorizzare i prodotti.
  [ ] **Use light/dark inverted mode**: Utilizzare la modalità chiaro/scuro invertita.

- **Tag Family**: La famiglia del tag.

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Titolo visualizzato sul tag durante l'integrazione CMS.
- **Tag subtitle**: Sottotitolo visualizzato sul tag durante l'integrazione CMS.
- **Short content**: Contenuto breve da visualizzare secondo la variazione.
- **Full content**: Contenuto lungo da visualizzare secondo la variazione.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: Un elenco di foto da caricare. Ogni foto è associata a una variazione.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Pulsanti, associati a link, presenti quando si visualizza il tag in una zona o pagina CMS.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text**: Descrizione del pulsante associato al tag.
    _Esempio: "Vedi Altro"_
  - **URL**: Link URL che punta a una pagina o contenuto aggiuntivo al clic del pulsante.
  - **Open in new tab**: Opzione per aprire il link in una nuova scheda del browser.

- **CSS Override**: Per sovrascrivere il CSS esistente sul tag.

## Integrazione CMS

Per integrare un tag in una zona o pagina CMS, aggiungerlo come segue: `[Tag=slug?display=var-1]`.
I valori `var` definiscono le possibili variazioni di visualizzazione, da `var-1` a `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

E il vostro tag sarà visualizzato ai vostri utenti come segue.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
