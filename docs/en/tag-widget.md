# Tag Widget Documentation

Accessible via **Admin** > **Widgets** > **Tag**, tags are:

- A way to manage creators/brands/categories without a heavy category/brand/manufacturer management system.
- A way to dress up and add depth to be-BOP web pages with both static and dynamic content on CMS pages.
- A way to give partners and sellers a means to have a beautiful, well-filled catalog, filled with context around products, the pseudo-dynamic categories not being just a list of products.
  ![image](https://github.com/user-attachments/assets/ce4fc8ff-b00e-4cb9-ab03-19440e62165a)

## Tag Family

Tags are classified into 4 families for easier organization.

- Creators: for creator tags
- Retailers: for tags related to a store
- Temporal: for temporal tags
- Events: for event tags

## Special Tags

There is a special tag `pos-favorite`, see [pos-touch-screen.md].

## Adding a Tag

To add a tag, click on **Create new tag**.

![image](https://github.com/user-attachments/assets/38232d3a-2f87-4319-88a9-18d68df09efa)

The **"Add a tag"** interface allows users to add a new tag with specific information, such as name, slug, family, title, subtitle...

### Form Fields

- **Tag name**: The name that identifies the tag.
- **Slug**: Unique identifier used in the URL, for CMS integration... Auto-generated from the name.

  ![image](https://github.com/user-attachments/assets/1f138c74-43df-406a-b9b7-72464f720efd)

- **Options**

  ![image](https://github.com/user-attachments/assets/5ff43f22-c5c0-42e2-8e69-f6465bd2a81d)

  [ ] **For widget use only**: For CMS integration only, cannot be used as a category.
  [ ] **Available for product tagging**: Available for categorizing products.
  [ ] **Use light/dark inverted mode**: Use the light/dark inverted mode.

- **Tag Family**: The tag family.

  ![image](https://github.com/user-attachments/assets/dbd0e997-4f08-43d0-ad19-f8e44acf0b28)

- **Tag Title**: Title displayed on the tag during CMS integration.
- **Tag subtitle**: Subtitle displayed on the tag during CMS integration.
- **Short content**: Short content to display according to the variation.
- **Full content**: Long content to display according to the variation.

  ![image](https://github.com/user-attachments/assets/122014fb-4fe8-450b-aef0-a8b502d08b59)

- **List pictures**: A list of photos to upload. Each photo is associated with a variation.

  ![image](https://github.com/user-attachments/assets/a8ad9c5f-9d06-430f-baeb-f13aef2b386d)

- **CTAs**: Buttons, associated with links, found when displaying the tag in a CMS zone or page.
  ![image](https://github.com/user-attachments/assets/3094ce02-132d-4406-bc03-15c0c449d4a1)

  - **Text**: Description of the button associated with the tag.
    _Example: "See More"_
  - **URL**: URL link pointing to a page or additional content when clicking the button.
  - **Open in new tab**: Option to open the link in a new browser tab.

- **CSS Override**: To override existing CSS on the tag.

## CMS Integration

To integrate a tag into a CMS zone or page, add it as follows: `[Tag=slug?display=var-1]`.
The `var` values define the possible display variations, ranging from `var-1` to `var-6`.

![image](https://github.com/user-attachments/assets/8f492752-f94c-4135-b9cb-b0fbc4e03f1d)

And your tag will be displayed to your users as follows.

![image](https://github.com/user-attachments/assets/a7a9319e-65f5-4d9b-8299-3c6cdbe7b93b)
