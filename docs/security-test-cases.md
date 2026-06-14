# Security Test Cases - Cookie Authorization & Env Configuration

This document specifies the security test cases designed to verify the implementation of HttpOnly Cookie authentication, XSS/CSRF defenses, and configuration protections in the AI Study Hub.

---

## 1. Test Environment Pre-requisites

- The backend is running at `http://localhost:8080`.
- An active test account:
  - **Email**: `security-test@gmail.com`
  - **Password**: `TestPass123`
  - **Status**: `ACTIVE`
- Postman or a standard browser with Developer Tools (Network and Application tab) open.

---

## 2. Test Cases Specification

### TC-SEC-01: Login Success Sets HttpOnly Cookie Without Exposing Token in Body

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that a successful login response establishes a secure cookie session and does not return the raw JWT token in the JSON body. |
| **API Endpoint** | `POST /api/auth/login` |
| **Request Body** | `{ "email": "security-test@gmail.com", "password": "TestPass123" }` |
| **Steps** | 1. Send the login request.<br>2. Inspect the HTTP Response Headers.<br>3. Inspect the JSON Response Body. |
| **Expected Results**| - Response status code is `200 OK`.<br>- Response header contains `Set-Cookie: accessToken=<jwt_token>; Path=/; HttpOnly; SameSite=Strict`.<br>- The JSON response does NOT contain a `token` key or any reference to the raw JWT. |

---

### TC-SEC-02: JavaScript Code Cannot Read the Authentication Cookie (Mitigating XSS)

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that client-side JavaScript is barred from reading the session cookie. |
| **Precondition** | User has logged in successfully and has an active session cookie. |
| **Steps** | 1. Open the browser Developer Console (`F12`) on the frontend dashboard.<br>2. Run the command: `console.log(document.cookie);`. |
| **Expected Results**| - The returned string of cookies does NOT contain `accessToken` (it must be empty or only show non-sensitive client-side keys), demonstrating that `HttpOnly` is active. |

---

### TC-SEC-03: Frontend Does Not Store Token in Web Storage

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that the frontend application does not persist session tokens in vulnerable local storage caches. |
| **Precondition** | User has logged in and is viewing the dashboard page. |
| **Steps** | 1. Open the browser Developer Tools and navigate to the **Application** (or **Storage**) tab.<br>2. Expand **Local Storage** and **Session Storage** for `http://127.0.0.1:5500` (or the frontend URL).<br>3. Look for any item key referencing `token`, `jwt`, or `accessToken`. |
| **Expected Results**| - No raw authentication JWT tokens are found in either Local Storage or Session Storage. |

---

### TC-SEC-04: Accessing User Info API (`/api/auth/me`) Without Cookie

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that accessing the user identification endpoint without an active session cookie triggers authorization failure. |
| **API Endpoint** | `GET /api/auth/me` |
| **Headers** | No headers set. |
| **Cookies** | Clear all cookies before sending the request. |
| **Steps** | 1. Submit the GET request without credentials. |
| **Expected Results**| - Response status code is `401 Unauthorized`. |

---

### TC-SEC-05: Accessing Protected Endpoints Without Session Cookie

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that general resources (documents and folders) are protected against unauthenticated requests. |
| **API Endpoints** | `GET /api/documents/my` and `GET /api/folders/my` |
| **Cookies** | Clear all session cookies. |
| **Steps** | 1. Submit a GET request to the user's documents library list endpoint (`/api/documents/my`).<br>2. Submit a GET request to the user's folders retrieval endpoint (`/api/folders/my`). |
| **Expected Results**| - Both requests receive a `401 Unauthorized` status response. |

---

### TC-SEC-06: Automatic Cookie Session Propagation on Protected Endpoints

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that the browser propagates the secure cookie automatically to authorize valid operations. |
| **Precondition** | User has logged in successfully and has the active `accessToken` cookie. |
| **API Endpoint** | `GET /api/auth/me` |
| **Steps** | 1. Send the request with credential inclusion activated (`credentials: 'include'`). |
| **Expected Results**| - Response status code is `200 OK`.<br>- User info details (`userId`, `fullName`, `email`, `role`, `status`) are returned successfully in the response body. |

---

### TC-SEC-07: Logout Clears the Authentication Cookie

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that logging out successfully invalidates the active cookie by expiring it. |
| **API Endpoint** | `POST /api/auth/logout` |
| **Steps** | 1. Send the logout request.<br>2. Inspect the response headers for cookie deletion directives. |
| **Expected Results**| - Response status code is `200 OK`.<br>- Response header contains `Set-Cookie: accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict` (clearing the cookie in the browser). |

---

### TC-SEC-08: Configuration Security - Environment Secrets Isolation

| Item | Details |
| :--- | :--- |
| **Objective** | Verify that the application fails to initialize if required environment variables are absent, proving that secrets are not hardcoded. |
| **Precondition** | Run the application locally in a terminal environment. |
| **Steps** | 1. Clear the environment variables: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`.<br>2. Attempt to start the Spring Boot application using `mvn spring-boot:run`. |
| **Expected Results**| - The application fails to start and logs a configuration resolve exception (e.g. `Could not resolve placeholder 'DB_URL'`), proving that the values are dynamically loaded and not hardcoded with fallbacks. |
