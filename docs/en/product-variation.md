# Product Variation Documentation

![image](https://github.com/user-attachments/assets/5d44dd81-a1d8-474e-b627-d5f3e01e955f)

Accessible when creating or editing a product, variations allow making a selection (on color, size, etc.) of an item before adding it to the cart.

## Creating or Adding a Product with Variations

When adding or editing a product, you can add variations. To do this:

- Check **This is a standalone product** so that the product with variations is not added to the cart with a quantity greater than 1.
- Check **Product has light variations (no stock difference)** to be able to add different variations.

  ![image](https://github.com/user-attachments/assets/80bfe14e-cec9-4b29-b8e2-eb3067a29b26)

To add a variation, fill in:

- **Name**: The title of the variation (example: Size)
- **Value**: A value for the name (example: XL)
- **Price difference**: The numerical value (in the same currency as the product price) to add when a user chooses this variation.
  (example: an XL t-shirt will cost 2 euros more than the base price of a t-shirt)

Click **add variation** to add a new variation. The '🗑️' icon allows deleting a variation already saved in the database.

## Display on the Product Page

![image](https://github.com/user-attachments/assets/ed13cc76-330b-4c3c-b162-52f6438ccca3)

When you display a product with variations, you can choose the variations before adding to cart. The name and variation list will be accessible on the product page.

## Display in Cart

![image](https://github.com/user-attachments/assets/747aed2c-854f-4bf4-a156-9a1b18f3616e)

![image](https://github.com/user-attachments/assets/394264ed-91c0-478c-9aa1-b9064c7c1b6b)

When a product with variations is added to the cart, the name becomes the product name concatenated with the variation value.

Example: T-shirt - XL - Red (where XL is a variation value of Size and Red a variation value of Color)
