# Back-office access

People with a be-BOP employee account and the super-admin can log in to the back office via /admin

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/73caa204-cc6e-4341-822b-0c0de228f1aa)

## First-time login and secure access

As the /admin url is too obvious, the be-BOP owner can configure a special string to secure access to the back office.

To do this, when you create be-BOP, go to /admin/config, then to this area :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/851475e9-965e-4078-8cec-51b0d875b46f)

Once this has been done, access will be possible via the url /admin-chaineconfiguree/login

Access to the wrong admin URL will redirect to this page:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/8634fef8-2296-4f6e-8f89-05246e991b74)

An employee with read/write access to /admin/arm can send you a password reset link, which contains the URL including /admins-secret

When a user is logged in, the /admin url automatically redirects to the correct link.

## Employee login

The employee login form is located at /admin-secret/login

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/10f207e0-01da-4c32-811b-dc0486982258)

You can extend the initial session timeout at the connection :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/91bab46e-4b89-4092-970f-787256dcbe22)

You will then have access to the admin area, depending on the rights assigned to your role:
- if you have read/write rights, the sub-menu link is normal
- if you have read-only rights, the sub-menu link is in italic (any action on the page will be refused)
- if you don't have read-only rights, the sub-menu link will be hidden, and an attempt to access it by direct url will send you back to the admin's homepage.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fd24b734-1fcf-4836-8d39-9e2239ef0ca0)

### Password security

During employee.e login, your password is checked.
The first and last encrypted characters of your password string are sent to [Have I Been Pawned](https://haveibeenpwned.com/), which returns a series of whole strings.
be-BOP then checks locally whether your password is present in this list (so that it is not communicated directly to Have I Been Pawned).
If the password is present, you'll be blocked with this security message, inviting you to change your password:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/f1107869-e56f-448a-b48b-8768e3b24e8a)

## Log out of the back office

You can log out by clicking on the red icon next to the "Admin" label in the header.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/94fa0243-cb74-4d71-9670-f5d89408e88b)

You will then be redirect back to the login page.

## Password recovery

If you lose your password, you can go to /admin-secret/login and click on "Recovery" :

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/fcf4e78b-25cb-4166-8b86-db46b75fc045)

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/43fe70ad-db23-4b54-a22a-4789c99d7ccb)

You will then be prompted to enter your login.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/7b7edd40-5200-4f88-946d-fc3798e16a9d)

If you enter the wrong identifier, you'll be notified, and you can try again with a different one. If you can't find your identifier, you'll have to ask the be-BOP administrator to give you the information again.

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cc91761f-7d98-4c16-a528-9b1939d12c85)

In the event of abuse by an employee, protection will be triggered:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/2fe6096e-664d-473f-8eff-d57755da3191)

If the login exists, this message is sent to the contact address linked to the account (email, npub, or both):

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/58ac0240-f729-4075-9e9a-3b60a68476e7)

Using an expired or already-used link will take you back to an error page:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d5477b08-1909-47d2-8c95-7adc1d517ea3)

This link contains a one-time use token that sends you to the password reset page.

If the password you enter is too short, this block will be displayed:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/d04feace-1751-4587-83c0-7cdced828cd4)

If the password is detected on Have I Been Pwned, this lock will be displayed:

![image](https://github.com/B2Bitcoin/beBOP/assets/50206014/cc5b31e5-097e-4aa0-b529-a13643fcb39d)

If the password is valid, you are redirected to the login page and can now log in with it.
