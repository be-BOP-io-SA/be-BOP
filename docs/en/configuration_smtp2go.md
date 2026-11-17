# Introduction

This documentation aims to help be-BOP owners configure automatic email sending in the simplest and most cost-free way found to date.

Email providers tested so far that work:
- Outlook.fr
- (more to come)

Those that don't work (DMARC restriction):
- GMail
- Protonmail
- (more to come)

Feel free to test and let us know if your email providers work or not at contact@be-bop.io

# Preface

Once upon a time, there was a wonderful era when owners of interactive websites or online stores could freely send automatic emails for free.
It was the time when free email providers easily allowed the use of an email inbox by a third-party application.
It was the time when transactional SMTP was permitted and free.
It was the time when people were happy.
It was the time.
But then one day the Paywall nation decided to attack...

Nowadays, transactional SMTP, when not strictly prohibited, is subject to an SMTP token offered only in a paid business plan, or depends on a third-party specialized in mass email sending, requiring extensive DNS zone configurations that exclude regular users, who must then resort to expensive web agencies to configure a service that is initially free but quickly becomes paid.
These people, who may only need to notify about a dozen online orders each month, were then left helpless...
Their only remaining choices were:
- subscribing to a paid email service
- subscribing to certain specific domain providers also offering email
- using complex third-parties requiring technical assistance or significant learning time
- abandoning email notifications, and being rejected by their first customers due to this shortcoming

...and then the be-BOP team arrived with smtp2go.

# Description

smtp2go is a cloud email delivery platform that enables sending and tracking emails.
Although using a third-party is not ideal, it is the best compromise found to date for people who don't have an email account that authorizes transactional SMTP.
By associating smtp2go with an existing email address, and a simple technical verification of the email account, smtp2go allows be-BOP to send emails up to 1,000/month on its free plan.

# Procedure

- Create (or have available) a reachable email address that will receive the emails sent by be-BOP to visitors, customers, and employees.
- Go to https://smtp2go.com
- Click on "Try SMTP2GO Free"
![image](https://github.com/user-attachments/assets/15df37a7-e869-466b-a0f0-6d57ab20f86e)
- Enter your email address (the one that will be used by be-BOP or your own — they can be different)
![image](https://github.com/user-attachments/assets/634084df-7d08-4230-9b48-b1e58f81593e)
- Enter your identity and business information (the password is only asked once, double-check your entry)
![image](https://github.com/user-attachments/assets/0e744761-df78-4af8-b2f0-9045f22bacd9)
- You will be asked to validate your email address:
![image](https://github.com/user-attachments/assets/f410a73a-2bbf-401f-badb-7cd9b48cb982)
- Access your inbox, open the SMTP2GO message, and click the confirmation link in the message body
![image](https://github.com/user-attachments/assets/f5061a8e-47e5-4a53-b258-e2dc05a24b18)
![image](https://github.com/user-attachments/assets/52c2da09-13d4-439a-8688-9a02d0d9ac31)
- Your account will now be activated
![image](https://github.com/user-attachments/assets/a17933ad-06bd-4923-aa6f-e269d197d1e7)
![image](https://github.com/user-attachments/assets/45123e12-8c37-4acc-b5a3-703be7819d07)
- Then verify the sender (green "Add a verified sender" button) and choose the right option "Single sender email" / "Add a single sender email"
![image](https://github.com/user-attachments/assets/2d498939-d719-42dc-8e1d-b1de02ff81d9)
- Enter the email address that will be used by be-BOP and submit the form
![image](https://github.com/user-attachments/assets/b3e8eca1-8ef2-4b15-8c4b-f8d5ea3d38ff)
- If your email provider does not block the option, you will see this display:
![image](https://github.com/user-attachments/assets/29ed4534-97e8-4233-85df-5bddd89b39af)
You will also receive this message by email: you will need to validate it by clicking the "Verify email@domain.com" button
![image](https://github.com/user-attachments/assets/ad8821de-05e0-41f7-967f-bcbb4f314128)
![image](https://github.com/user-attachments/assets/d803848f-38b5-4190-8c87-771e2716a6ec)
However, if you see the following message, it means your email provider refuses the association (probably because it offers transactional SMTP as a paid service or under other conditions):
![image](https://github.com/user-attachments/assets/8fccde94-6fd6-46a7-b8b1-32b705c9f0f8)
- Once the verification email is validated, your sender should be displayed like this:
![image](https://github.com/user-attachments/assets/f0520770-d5c5-4ecb-bd28-489b5e8845b8)
- In the left menu, go to "SMTP Users" then click "Continue"
![image](https://github.com/user-attachments/assets/32edfbca-955c-4c10-86e9-cdfd384ce6e5)
![image](https://github.com/user-attachments/assets/b3bc18d7-a571-478b-baf3-ca998f6d5238)
- Click on "Add a SMTP User"
![image](https://github.com/user-attachments/assets/1e8ac389-30a1-4e88-b4e6-3005db0aaa72)
- SMTP2GO pre-fills the form with an SMTP user whose default Username is the domain of your sending email address. You can leave it as is, or customize it for security reasons (and since the identifier must be unique on SMTP2GO, a too-simple identifier will already be taken and rejected). Then validate by clicking the "Add SMTP User" button.
![image](https://github.com/user-attachments/assets/aec892a2-dd54-4764-823f-77683871e3f2)
- You can then configure be-BOP with the following information and restart it:
```
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=the_username_chosen_on_smtp2go
SMTP_PASSWORD=the_password_chosen_on_smtp2go
```

# Watch Your Configuration

To avoid email sending issues, make sure the sending email address is the same as the one configured in the be-BOP back-office, in Admin > Config > Identity, under "Contact Information > Email":
![image](https://github.com/user-attachments/assets/4d11ab10-837b-4154-9962-922c6a000ed9)

# Disclaimer

- Beyond 1,000 emails sent per month, email sending will stop working, and SMTP2GO will send you a solicitation to upgrade to a paid plan
- The be-BOP software is in no way associated with or affiliated to the SMTP2GO service
- be-bop.io is in no way associated with or affiliated to smtp2go.com
- be-BOP.io SA is in no way associated with or affiliated to SMTP2GO
- The be-BOP team does not provide SMTP2GO support
- The be-BOP team only provides this documentation to help their users and avoid having them resort to paid or complex services

Death to paywalls ✊
