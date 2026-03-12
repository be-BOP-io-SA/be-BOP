# Documentazione Widget Specifiche

Accessibile tramite **Admin** > **Widgets** > **Specifications**, i widget specifiche possono essere utilizzati nel vostro be-BOP per integrare specifiche nelle zone o pagine CMS. Questo widget può essere utilizzato per fornire specifiche per i vostri articoli nel be-BOP.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Creare una Specifica

Per aggiungere una specifica, fare clic su **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Titolo

- Inserire un titolo che descriva le specifiche.

### 2. Slug

- Fornire un identificatore univoco.
  Questo slug è utilizzato come chiave univoca per riferimenti interni o URL.

### 3. Contenuto

- Compilare il contenuto come tabella CSV strutturata con le seguenti colonne:
  - **Categoria**: Il gruppo a cui appartiene la specifica.
  - **Etichetta**: Nome specifico della caratteristica.
  - **Valore**: Dettaglio della specifica.

#### Esempio di contenuto per un orologio:

```csv
"Cassa e quadrante";"Metallo";"Oro rosa 18 carati"
"Cassa e quadrante";"Diametro cassa";"41"
"Cassa e quadrante";"Spessore";"9,78 mm"
"Cassa e quadrante";"Diamanti (carati)";"10,48"
"Cassa e quadrante";"Quadrante";"Oro rosa 18 carati interamente tempestato di diamanti"
"Cassa e quadrante";"Impermeabilità";"100 metri"
"Cassa e quadrante";"Fondello";"Cristallo di zaffiro"
"Movimento";"Movimento";"Chopard 01.03-C"
"Movimento";"Tipo di carica";"Movimento meccanico a carica automatica"
"Movimento";"Funzione";"Ore e minuti"
"Movimento";"Riserva di carica";"Riserva di carica di circa 60 ore"
"Movimento";"Frequenza";"4 Hz (28.800 alternanze all'ora)"
"Movimento";"Spirale";"Piatta"
"Movimento";"Bilanciere";"A tre bracci"
"Movimento";"Dimensioni del movimento";"Ø 28,80 mm"
"Movimento";"Spessore del movimento";"4,95 mm"
"Movimento";"Numero di componenti";"182"
"Movimento";"Rubini";"27"
"Cinturino e fibbia";"Tipo di fibbia";"Fibbia deployante"
"Cinturino e fibbia";"Materiale della fibbia";"Oro rosa 18 carati"

```

## Integrazione CMS

Per aggiungere una specifica in una zona CMS, è possibile utilizzare `[Specification=slug]`.

- Esempio in una zona CMS di un prodotto.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  E quando si visualizza il prodotto, si vedrà:
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
