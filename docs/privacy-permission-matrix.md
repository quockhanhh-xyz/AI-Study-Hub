# Privacy and Permission Matrices

This document specifies the privacy rules and the permission regression matrix implemented in the AI Study Hub.

---

## 1. Privacy Matrix

To guarantee strict privacy isolation, the system controls which user identifier fields are returned depending on the visibility scope of the request:

| Context / Page | User Field to Expose | Description / Behavior |
| :--- | :--- | :--- |
| **Community / Public Library** | `displayName` (FullName) | Emails and unique database user IDs (e.g. `ownerId`, `uploadedBy`) must be excluded from public listings/details to prevent public email harvesting. |
| **Document Detail / Card** | `uploadedByName` (FullName) | Non-owner users see the uploader's display name instead of their email. The `uploadedBy` email field is nullified in responses sent to non-owners. |
| **Shared With Me** | `sharedByName` (FullName) | The recipient user views the full name of the sender who initiated the direct share. Email visibility is restricted (nullified for recipient view). |
| **Group Members List** | `displayName` (FullName) + `role` | Group members see names and roles within the group. Individual email addresses of other members are hidden (nullified). |
| **Account / Profile Detail** | `email` of the current logged-in user | A user's profile detail endpoint is strictly personal and only returns the email address belonging to the authenticated user. |
| **Share Forms (Direct Share)** | Input field: `email` | Users still input target user emails to initiate a direct share. Direct share list records visible to the owner retain the recipient's email to support management actions. |

---

## 2. Permission Regression Matrix

Below is the state-action matrix defining allowed actions for each user role (Actor) across different document and share states.

> [!NOTE]
> **REVOKED** is not an intrinsic document state, but rather a share state. When a direct share or group share is revoked, the actor simply transitions back to being an **Outsider** for that document.

### State-Action Matrix for Document Actions

| Actor | State of Document | Metadata (List/Detail) | Preview | Open | Download | Edit | Move | Share | Delete / Restore |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Guest / Anonymous** | PUBLIC APPROVED | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | PRIVATE | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| | UNPUBLISHED / PENDING | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| | DELETED (Trashed) | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| **Owner** | PUBLIC APPROVED | Yes / Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| | PRIVATE | Yes / Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| | UNPUBLISHED / PENDING | Yes / Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| | DELETED (Trashed) | Yes (Trash List) / No (Detail 404) | No (404) | No (404) | No (404) | No | No | No | Yes (Restore/Delete) |
| **Direct Shared User** | PUBLIC APPROVED | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | PRIVATE | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | UNPUBLISHED / PENDING | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | DELETED (Trashed) | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| **Group Member** | PUBLIC APPROVED | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | PRIVATE | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | UNPUBLISHED / PENDING | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | DELETED (Trashed) | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| **Outsider (Other User)** | PUBLIC APPROVED | Yes / Yes | Yes | Yes | Yes | No | No | No | No |
| | PRIVATE | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| | UNPUBLISHED / PENDING | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |
| | DELETED (Trashed) | No / No (404) | No (404) | No (404) | No (404) | No | No | No | No |

### Key Implementation Principles:
1. **Resource Leakage Protection**: When a resource is private or unauthorized (e.g., accessed by an Outsider or Guest when the state is PRIVATE), the backend explicitly returns `404 Not Found` (rather than `403 Forbidden`) to hide the resource's existence and prevent enumeration.
2. **Trashed Resources**: Trashed resources are strictly inaccessible to all actors (including the owner) via detail, preview, or download endpoints, returning `404 Not Found`. Only the owner can list them in the Trash interface or perform administrative Restore/Delete actions.
3. **Backend Action Blockers**: Even if the frontend UI hides any access or action buttons based on permission flags, the backend service strictly validates ownership and shared access maps on every single action request.
