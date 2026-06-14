# Security Setup Guide - AI Study Hub

This document details the security architecture, environment variable requirements, and configuration instructions for the AI Study Hub codebase.

---

## 1. Security Architecture Overview

AI Study Hub implements a modern, secure session state using **HttpOnly Cookies** for JWT distribution. This design avoids storing sensitive identity tokens on the client side, significantly mitigating typical front-end vulnerabilities.

```mermaid
sequenceDiagram
    participant User as Frontend / User
    participant Server as Backend API Server
    participant DB as MySQL Database

    User->>Server: POST /api/auth/login {email, password}
    Server->>DB: Validate user status and hash
    DB-->>Server: User details verified
    Server->>Server: Generate JWT (accessToken)
    Server-->>User: HTTP 200 OK + Set-Cookie (HttpOnly, SameSite=Strict)
    Note over User, Server: Cookie is managed by browser; JS cannot access it.

    User->>Server: GET /api/auth/me (Automatic Cookie propagation)
    Server->>Server: Validate accessToken from Cookie
    Server-->>User: HTTP 200 OK + Current User Info
```

### Cookie Parameters for Session Protection
To defend against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF), the session cookie utilizes the following attributes:

| Parameter | Recommended Value | Security Purpose |
| :--- | :--- | :--- |
| **Name** | `accessToken` | Identifies the session key. |
| **HttpOnly** | `true` | Restricts browser-side scripts (`document.cookie`) from reading the cookie, mitigating token theft via XSS. |
| **Secure** | `true` (prod) / `false` (dev) | Ensures the cookie is only transmitted over encrypted SSL (HTTPS) connections. |
| **SameSite** | `Strict` | Restricts the cookie from being sent with cross-site requests, providing robust protection against CSRF attacks. |
| **Path** | `/` | Defines the path scope to make the token globally visible to all endpoints. |

---

## 2. Environment Variables Configuration

To keep production credentials secure and prevent compliance violations, no secrets are hardcoded in the codebase. The Spring Boot application properties file (`application.properties`) dynamically references environment variables.

### Required Environment Variables

Ensure the following variables are configured in the host environment:

| Variable Name | Configuration Target | Example/Description |
| :--- | :--- | :--- |
| `DB_URL` | Database Connection URL | `jdbc:mysql://localhost:3306/ai_study_hub` |
| `DB_USERNAME` | Database Username | `root` |
| `DB_PASSWORD` | Database Password | `your_secure_password` |
| `JWT_SECRET` | Secret key for JWT generation | A secure Base64-encoded string (Minimum 256-bit) |
| `GMAIL_USERNAME` | Automated Gmail Address | `noreply.aistudyhub@gmail.com` |
| `GMAIL_APP_PASSWORD` | Google App Password | `abcd efgh ijkl mnop` (16-character code) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Identifier | `cloudinary_user` |
| `CLOUDINARY_API_KEY` | Cloudinary Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary Secret Key | `abcdefghijklmnopqrstuvwxyzABCDEF` |

---

## 3. Local Development Setup Guide

For local development, environment variables can be populated without committing credentials to Git.

### Option A: IntelliJ IDEA (Recommended)
1. Open the **Run/Debug Configurations** dropdown.
2. Select the configuration for `AiStudyHubApplication`.
3. Under the **Environment** section, locate the **Environment variables** field.
4. Add the key-value pairs formatted as:
   ```text
   DB_URL=jdbc:mysql://localhost:3306/ai_study_hub;DB_USERNAME=root;DB_PASSWORD=your_pass;JWT_SECRET=your_secret_key;GMAIL_USERNAME=user@gmail.com;GMAIL_APP_PASSWORD=app_pass;CLOUDINARY_CLOUD_NAME=name;CLOUDINARY_API_KEY=key;CLOUDINARY_API_SECRET=secret
   ```
5. Apply changes and start the application.

### Option B: PowerShell (Local Terminal)
Set environment variables within the terminal session before compiling and running:
```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/ai_study_hub"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_secure_password"
$env:JWT_SECRET="bXlTZWNyZXRLZXlGb3JKd3RUb2tlbkdlbmVyYXRpb25UaGF0SXNMb25nRW5vdWdo"
$env:GMAIL_USERNAME="noreply@gmail.com"
$env:GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
$env:CLOUDINARY_CLOUD_NAME="demo"
$env:CLOUDINARY_API_KEY="12345"
$env:CLOUDINARY_API_SECRET="secret_key"

mvn spring-boot:run
```

---

## 4. Git Protection Rules

The codebase utilizes Git filtering to prevent credentials from being shared remotely. Ensure the root `.gitignore` file contains entries to prevent local development credentials and config overrides from being staged:

```gitignore
# Environment / secret files
.env
.env.*
application-local.properties
application-secret.properties
*service-account*.json
*.secret
*.key
```

Under no circumstances should custom local properties files containing real api keys or database credentials (such as `application-local.properties`) be force-committed or bypassed.
