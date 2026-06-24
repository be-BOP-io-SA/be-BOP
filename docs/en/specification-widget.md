# Specification Widget Documentation

Accessible via **Admin** > **Widgets** > **Specifications**, specification widgets can be used in your be-BOP to integrate specifications into CMS zones or pages. This widget can be used to provide specifications for your items in your be-BOP.

![image](https://github.com/user-attachments/assets/ea71f7e2-aa77-44d0-84f7-e4c0e7cda506)

## Creating a Specification

To add a specification, click on **Add specification**.

![image](https://github.com/user-attachments/assets/892889ef-9bcc-484e-abe2-b8615d9ff9f0)

### 1. Title

- Enter a title describing the specifications.

### 2. Slug

- Provide a unique identifier.
  This slug is used as a unique key for internal references or URLs.

### 3. Content

- Fill in the content as a structured CSV table with the following columns:
  - **Category**: The group to which the specification belongs.
  - **Label**: Specific name of the characteristic.
  - **Value**: Specification detail.

#### Example content for a watch:

```csv
"Case and dial";"Metal";"18-carat rose gold"
"Case and dial";"Case diameter";"41"
"Case and dial";"Thickness";"9.78 mm"
"Case and dial";"Diamonds (carats)";"10.48"
"Case and dial";"Dial";"18-carat rose gold fully set with diamonds"
"Case and dial";"Water resistance";"100 meters"
"Case and dial";"Case back";"sapphire crystal"
"Movement";"Movement";"Chopard 01.03-C"
"Movement";"Winding type";"mechanical movement with automatic winding"
"Movement";"Function";"hours and minutes"
"Movement";"Power reserve";"Power reserve of approximately 60 hours"
"Movement";"Frequency";"4 Hz (28,800 vibrations per hour)"
"Movement";"Hairspring";"flat"
"Movement";"Balance";"three-arm"
"Movement";"Movement dimensions";"Ø 28.80 mm"
"Movement";"Movement thickness";"4.95 mm"
"Movement";"Number of movement components";"182"
"Movement";"Jewels";"27"
"Strap and buckle";"Buckle type";"folding clasp"
"Strap and buckle";"Buckle material";"18-carat rose gold"

```

## CMS Integration

To add a specification to a CMS zone, you can use `[Specification=slug]`.

- Example in a product CMS zone.
  ![image](https://github.com/user-attachments/assets/3e117832-a7cb-4796-b20c-a994b89c0261)

  And when displaying the product, you will see:
  ![image](https://github.com/user-attachments/assets/bd9f965c-da71-4d22-8f7e-df8eafc002e3)
