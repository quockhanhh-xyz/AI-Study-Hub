# Auth Test Cases - Gmail OTP Flow

## Test Scope

This document defines test cases for Step 1 - Authentication with Gmail OTP.

Main flow:

```text
Register → create INACTIVE user → send Gmail OTP → verify OTP → user ACTIVE → login → dashboard
```

---

## Common Test Data

| Field          | Value                   |
| -------------- | ----------------------- |
| Base URL       | `http://localhost:8080` |
| Test email     | `user@gmail.com`        |
| Test password  | `12345678`              |
| OTP length     | 6 digits                |
| OTP expiration | 5 minutes               |

---

## TC-AUTH-01: Register Successfully

| Item            | Description                                                                         |
| --------------- | ----------------------------------------------------------------------------------- |
| API             | `POST /api/auth/register`                                                           |
| Precondition    | Email has not existed in the system                                                 |
| Request Body    | `{ "fullName": "Nguyen Van A", "email": "user@gmail.com", "password": "12345678" }` |
| Expected Result | Register successfully, user status is `INACTIVE`, OTP is sent to email              |

Expected response:

```json
{
  "success": true,
  "message": "Register successfully. Please verify OTP sent to your email.",
  "data": {
    "email": "user@gmail.com",
    "status": "INACTIVE"
  }
}
```

---

## TC-AUTH-02: Register with Existing Email

| Item            | Description                                                                         |
| --------------- | ----------------------------------------------------------------------------------- |
| API             | `POST /api/auth/register`                                                           |
| Precondition    | Email already exists in the system                                                  |
| Request Body    | `{ "fullName": "Nguyen Van A", "email": "user@gmail.com", "password": "12345678" }` |
| Expected Result | Register fails because email already exists                                         |

Expected response:

```json
{
  "success": false,
  "message": "Email already exists",
  "data": null
}
```

---

## TC-AUTH-03: Verify OTP Successfully

| Item            | Description                                               |
| --------------- | --------------------------------------------------------- |
| API             | `POST /api/auth/verify-otp`                               |
| Precondition    | User is `INACTIVE` and OTP is valid                       |
| Request Body    | `{ "email": "user@gmail.com", "otpCode": "123456" }`      |
| Expected Result | Email verified successfully, user status becomes `ACTIVE` |

Expected response:

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "user@gmail.com",
    "status": "ACTIVE"
  }
}
```

---

## TC-AUTH-04: Verify Wrong OTP

| Item            | Description                                          |
| --------------- | ---------------------------------------------------- |
| API             | `POST /api/auth/verify-otp`                          |
| Precondition    | User is `INACTIVE`                                   |
| Request Body    | `{ "email": "user@gmail.com", "otpCode": "000000" }` |
| Expected Result | Verification fails because OTP is invalid            |

Expected response:

```json
{
  "success": false,
  "message": "Invalid OTP",
  "data": null
}
```

---

## TC-AUTH-05: Verify Expired OTP

| Item            | Description                                          |
| --------------- | ---------------------------------------------------- |
| API             | `POST /api/auth/verify-otp`                          |
| Precondition    | OTP was created more than 5 minutes ago              |
| Request Body    | `{ "email": "user@gmail.com", "otpCode": "123456" }` |
| Expected Result | Verification fails because OTP has expired           |

Expected response:

```json
{
  "success": false,
  "message": "OTP has expired",
  "data": null
}
```

---

## TC-AUTH-06: Resend OTP

| Item            | Description                          |
| --------------- | ------------------------------------ |
| API             | `POST /api/auth/resend-otp`          |
| Precondition    | User exists and status is `INACTIVE` |
| Request Body    | `{ "email": "user@gmail.com" }`      |
| Expected Result | New OTP is sent to user's email      |

Expected response:

```json
{
  "success": true,
  "message": "OTP has been resent to your email",
  "data": {
    "email": "user@gmail.com"
  }
}
```

---

## TC-AUTH-07: Login Before OTP Verification

| Item            | Description                                             |
| --------------- | ------------------------------------------------------- |
| API             | `POST /api/auth/login`                                  |
| Precondition    | User exists but status is `INACTIVE`                    |
| Request Body    | `{ "email": "user@gmail.com", "password": "12345678" }` |
| Expected Result | Login fails because account is not verified             |

Expected response:

```json
{
  "success": false,
  "message": "Please verify your email before login",
  "data": null
}
```

---

## TC-AUTH-08: Login After OTP Verification

| Item            | Description                                             |
| --------------- | ------------------------------------------------------- |
| API             | `POST /api/auth/login`                                  |
| Precondition    | User exists and status is `ACTIVE`                      |
| Request Body    | `{ "email": "user@gmail.com", "password": "12345678" }` |
| Expected Result | Login successfully                                      |

Expected response:

```json
{
  "success": true,
  "message": "Login successfully",
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "email": "user@gmail.com",
    "role": "USER",
    "status": "ACTIVE",
    "token": "sample-token"
  }
}
```

---

## TC-AUTH-09: Login with Wrong Password

| Item            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| API             | `POST /api/auth/login`                                       |
| Precondition    | User exists                                                  |
| Request Body    | `{ "email": "user@gmail.com", "password": "wrongpassword" }` |
| Expected Result | Login fails because password is incorrect                    |

Expected response:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "data": null
}
```

---

## TC-AUTH-10: Login Blocked User

| Item            | Description                                             |
| --------------- | ------------------------------------------------------- |
| API             | `POST /api/auth/login`                                  |
| Precondition    | User exists and status is `BLOCKED`                     |
| Request Body    | `{ "email": "user@gmail.com", "password": "12345678" }` |
| Expected Result | Login fails because account is blocked                  |

Expected response:

```json
{
  "success": false,
  "message": "Your account has been blocked",
  "data": null
}
```

---

## Postman Testing Notes

- All requests must use base URL: `http://localhost:8080`.
- All request and response JSON fields must use camelCase.
- All APIs must return the common response format: `success`, `message`, `data`.
- Gmail password, app password, API key, and secret files must not be committed to GitHub.
