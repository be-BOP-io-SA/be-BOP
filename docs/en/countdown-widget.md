# Countdown Documentation

Available via **Admin** > **Widgets** > **Countdowns**, this interface allows you to configure a countdown that can be used to highlight an important deadline, such as a promotional offer or a special event.

![image](https://github.com/user-attachments/assets/83b9e486-98a2-4ff4-9cf3-3c6eef5edbd1)

---

## Adding a Countdown

To add a countdown, click on **Add countdown**.

![image](https://github.com/user-attachments/assets/7982d6d9-3086-4187-9231-96cb1a89a59e)

### 1. **Name**

- **Description**: Unique internal identifier for the countdown.

### 2. **Slug**

- **Description**: URL or unique identification key for the countdown.
- **Constraints**:
  - Can only contain lowercase letters, numbers, and hyphens.
  - Useful for generating specific links.

### 3. **Title**

- **Description**: Visible title associated with the countdown.
- **Usage**: This text can be displayed on the site to contextualize the countdown.

### 4. **Description**

- **Description**: Optional text describing the countdown details.
- **Usage**: Ideal for adding context or instructions about the event.

### 5. **End At**

- **Description**: End date and time of the countdown.
- **Details**:
  - The timezone is based on the user's browser (displayed in **GMT+0**).
  - Use the built-in calendar to intuitively select the date and time.

## CMS Integration

To integrate your countdown into a CMS zone or page, add it as follows: `[Countdown=slug]`.

![image](https://github.com/user-attachments/assets/ad57e29f-f5a8-4085-990a-ba96bdcaaf13)

And your countdown will be displayed to your users as follows.

![image](https://github.com/user-attachments/assets/1c0d58eb-7e9e-4d35-8cec-9a20e10751ba)
