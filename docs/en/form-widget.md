# Contact Form Widget Documentation

Accessible via **Admin** > **Widgets** > **Form**, form widgets can be used in your be-BOP to integrate contact forms into CMS zones or pages.

![image](https://github.com/user-attachments/assets/52d57248-1651-459b-9470-beb3ec671478)

## Adding a Contact Form

To add a contact form, click on **Add contact form**.

![image](https://github.com/user-attachments/assets/5a253ccf-be0c-4888-a27f-a20f65a641ea)

### Basic Information

![image](https://github.com/user-attachments/assets/9caac9f7-1ed7-4403-b192-d0e2eaa65eaf)

- **Title**: The name of the contact form.
- **Slug**: Unique identifier for the contact form.

### Contact Form Information

![image](https://github.com/user-attachments/assets/082d481e-1739-415e-bb8b-9b094ac087f9)

- **Target**: Allows the store owner to set a target email address or npub for contact notifications; if not filled in, the default value will be the identity's contact email.
- **Display from: field**: When checked, displays the sender (From:) field on the contact form. It is accompanied by a **Prefill with session information** checkbox that, when checked, pre-fills the from field with session information.
- **Add a warning to the form with mandatory agreement**: Adds a mandatory checkbox to display an agreement message before sending the contact form.
  - **Disclaimer label**: A title for the agreement message.
  - **Disclaimer Content**: The text of the agreement message.
  - **Disclaimer checkbox label**: The text for the agreement message checkbox.
- **Subject**: The subject of the contact form.
- **Content**: The content of the contact form.

For subjects and contents, you can use the following tags in the text:

`{{productLink}}` and `{{productName}}` when used on a product page.

`{{websiteLink}}`, `{{brandName}}`, `{{pageLink}}` and `{{pageName}}` when used anywhere else.

![image](https://github.com/user-attachments/assets/950ee0a8-b7ad-4a8a-bb9c-78fd44740b30)

## CMS Integration

To integrate your contact form into a CMS zone or page, add it as follows: `[Form=slug]`.

![image](https://github.com/user-attachments/assets/4826c9c0-a58a-4ebe-80de-fb6828d48635)

And your contact form will be displayed to your users as follows.

![image](https://github.com/user-attachments/assets/a66fd0ff-1a53-40b2-9310-f12949121305)
