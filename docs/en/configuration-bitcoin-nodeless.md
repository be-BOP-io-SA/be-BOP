# Bitcoin Nodeless Configuration

![image](https://github.com/user-attachments/assets/fa41dab9-8cd9-4e9e-b16c-379d2ef60565)

This page allows you to configure the "Bitcoin nodeless" module to generate addresses and track Bitcoin payments while maintaining full control of funds on your own wallet.
It is accessible via **Admin** > **Payment Settings** > **Bitcoin nodeless**.

---

## **Configuration**

### **1. BIP Standard**

![image](https://github.com/user-attachments/assets/4d15d6e0-be4a-4de0-bad4-f8b081d6fbe4)

- **Description**: BIP standard used to generate Bitcoin addresses.
- **Available options**:
  - `BIP 84` (currently, this is the only supported option).
- **Instructions**:
  - If you are using a compatible wallet, choose `BIP 84`.

---

### **2. Public Key (ZPub)**

![image](https://github.com/user-attachments/assets/c4685fc6-d372-45e5-bb58-21e808223a26)

- **Description**: A public key in `zpub` format for Bitcoin transactions.
- **Instructions**:
  - Use a wallet such as **Sparrow Wallet** to generate a `zpub` or `vpub` (for testnet) key.
  - Make sure the derivation path is:
    - Mainnet: `m/84'/0'/0'`
    - Testnet: `m/84'/1'/0'`
  - Enter the key in the field.

---

### **3. Derivation Index**

![image](https://github.com/user-attachments/assets/9c1007a9-97c7-4a92-9714-0e64e3acacd6)

- **Description**: The index of the address to generate.
- **Instructions**:
  - By default, starts at `0` and increments by `1` for each new generated address.
  - **Do not modify this value** unless you know what you are doing — this could lead to address reuse or create addresses that won't be detected by your wallet.

---

### **4. Mempool URL**

![image](https://github.com/user-attachments/assets/de0f8fd5-9849-4467-8475-d35335f4a926)

- **Description**: Mempool API URL to check incoming funds on generated addresses.
- **Default example**:
  - Testnet: `https://mempool.space/testnet`
- **Instructions**:
  - If you host your own Mempool instance, you can replace this URL.
  - For testnet, add the `/testnet` suffix.

---

## **Next Generated Addresses**

The next addresses generated from this configuration are displayed in the **"Next addresses"** section. These addresses are based on the public key and derivation index.

![image](https://github.com/user-attachments/assets/e1e28e03-82db-40d6-8438-fe1c5eaef4a0)
