# POS Touch Screen Management Interface Documentation

This documentation describes the features of the touch interface (POS Touch Screen) for selecting and managing items in the cart.

---

## General Overview

![image](https://github.com/user-attachments/assets/ce8f6249-ec8b-4439-a24f-159d0cf997b7)

The interface is divided into several sections to facilitate sales management:

1. **Cart**: Displays items selected by the customer.
2. **Favorites and Item Tags**: Allows quick item retrieval.
3. **All Items**: Displays all available items.
4. **Actions**: Buttons to manage the cart and finalize the sale.

---

## Configuration

In admin/tag, pos-favorite is a tag to create to display items as favorites by default on the /pos/touch interface.

![image](https://github.com/user-attachments/assets/4f08136a-1409-42c0-98b8-16f0e153ad71)

In admin/config/pos, you can add tags to serve as menus on /pos/touch.

![image](https://github.com/user-attachments/assets/21b281cf-a65e-448d-8aac-de797c423b34)

## Section Descriptions

### 1. Cart

![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

- **Display**: Located on the left side of the interface, this section shows items currently in the cart.
- **Initial state**: Displays "Cart is empty" when no items have been added.
- **Functionality**: Allows viewing added items along with their quantity and total price.
- **Adding to Cart**: To add to cart on a point-of-sale screen, simply click on the item.

  ![image](https://github.com/user-attachments/assets/e757ef03-d455-4c91-8cdf-f383e210777c)

  And the item will be added to the cart and displayed on the ticket block.

  ![image](https://github.com/user-attachments/assets/25fdc955-0d89-4699-9288-3724f222f712)

  When an item is added to the cart, you can add a note by clicking on the item name.

  ![image](https://github.com/user-attachments/assets/21a9b760-3cc5-42af-8f18-fea374ea573d)

  ![image](https://github.com/user-attachments/assets/9e2c764a-40fc-44d4-b112-c8a3e6334946)

### 2. Favorites and Item Tags

- **Favorites**: The `Favorites` section at the top of the interface presents a list of items marked as favorites for quick access.

  ![image](https://github.com/user-attachments/assets/c7f14e88-350f-40ba-8f20-da70d3b068b0)

- **Managing Favorites**: You can mark items as favorites during their creation for easier subsequent access.

- **Item Tags**: The section below "Favorites" presents a list of items organized by different tags.

  ![image](https://github.com/user-attachments/assets/563d0c7f-3f4d-4d57-a9da-5a94000e4989)

### 3. All Items

- **Item Display**: Presents a list of all available items in the system, organized with images and item names.

  ![image](https://github.com/user-attachments/assets/0fd64e7c-8de8-4212-827c-0d3f53a72f37)

### 4. Actions

![image](https://github.com/user-attachments/assets/b7df647e-cf8e-4e78-86ca-4e89478bc1e4)

This section groups the buttons for managing the cart, saving, or finalizing a sale:

- **Tickets**: Access current sales tickets.
- **Pay**: Redirects to the /checkout page to finalize the sale of items in the cart and records the transaction.

  ![image](https://github.com/user-attachments/assets/6f353fce-d587-4a2d-bff2-709f765c3725)

- **Save**: Saves the current cart state or setting modifications.
- **Pool**: Can be used to split the order, manage item groups, or associate customers with a specific order.
- **Open Drawer**: Opens the cash drawer to access funds (requires a connected physical system).
- **🗑️**: Allows clearing the cart contents.

  ![image](https://github.com/user-attachments/assets/85888c2d-4696-42cc-9ade-d4bf923a55f7)

- **❎**: Allows removing the last line from the cart.

  ![image](https://github.com/user-attachments/assets/20b9fc00-b128-4bb4-9ed7-ae207f63931f)

### 5. Theme

By default, POS Touch Screen uses the design shown in the previous screenshots, but it is possible to change this design by modifying the theme in **Admin** > **Merch** > **Themes**.

![image](https://github.com/user-attachments/assets/f5913dc9-2d5a-4232-b11a-f48b0461e93c)
