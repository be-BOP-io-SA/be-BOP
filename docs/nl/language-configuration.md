Taalconfiguratie

De sectie **Admin** > **Config** > **Languages** stelt u in staat om de beschikbare talen in uw applicatie te definiëren en de standaardtaal te configureren.

## Functies

### Beschikbare talen

- **Talenlijst**: Vink de vakjes aan van de talen die u beschikbaar wilt maken in uw be-BOP-applicatie. U moet minimaal een taal selecteren.

  - Voorbeeld: `English`, `Español (El Salvador)`, `Français`, `Nederlands`, `Italian`.

    ![image](https://github.com/user-attachments/assets/73b805c3-a7d1-4476-8b12-2e1aa89611d7)

### Standaardtaal

- **Standaardtaal**: Selecteer een taal die wordt gebruikt als de voorkeurstaal van de gebruiker niet beschikbaar is onder de opties.

![image](https://github.com/user-attachments/assets/578427db-15b4-4110-b60e-ad9fde470eb4)

### Beheer van de taalkiezer

![image](https://github.com/user-attachments/assets/caf5277b-cd87-44c5-8462-0e7cb3df2449)

- **Taalkiezer tonen of verbergen**: Klik op de link **here** om de zichtbaarheid van de taalkiezer in de gebruikersinterface te beheren.

  ![image](https://github.com/user-attachments/assets/38a748aa-387f-49e4-9c59-c8f29f0bb866)

# Aangepaste vertaalsleutels

De sectie **Custom Translation Keys** stelt u in staat om vertalingen voor verschillende talen in uw applicatie aan te passen.

## Functies

### Overzicht

![image](https://github.com/user-attachments/assets/d4404eca-12de-4547-84ff-36bdae620c6a)

- U kunt **specifieke vertaalsleutels** definiëren voor elke beschikbare taal.
- De vertaalsleutels worden gedefinieerd in JSON-formaat. Dit maakt een eenvoudig en gestructureerd beheer van uw vertalingen mogelijk.

### Vertalingen bewerken

1. **Selecteer een taal**:
   - Elke taal wordt weergegeven in een afzonderlijke sectie (bijvoorbeeld `en` voor Engels, `es-sv` voor Spaans uit El Salvador).
2. **Voeg uw vertalingen toe**:
   - Voeg sleutels en hun waarden toe of wijzig ze in het JSON-tekstveld.
   - Voorbeeld `en`:
     ```json
     {
     	"welcome_message": "Welcome to our store!",
     	"checkout": "Proceed to checkout"
     }
     ```

### Opslaan

- Zodra de vertalingen zijn toegevoegd of gewijzigd, worden de wijzigingen automatisch toegepast na validatie en opslaan.
