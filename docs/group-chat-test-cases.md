# Persistent Study Group Chat Test Cases - Step 12

This document defines the backend contract and frontend verification test cases for the Persistent Study Group Chat MVP implementation.

---

## 1. Backend Contract Test Cases

### 1.1. Permissions and Access Control (GET /api/groups/{groupId}/messages)

| TC | Actor | Group Status / User Membership | Expected HTTP | Expected Behavior |
|---|---|---|---|---|
| TC-GC-001 | Guest | Group ACTIVE, No auth cookie | 401 Unauthorized | Blocked from retrieving group messages. |
| TC-GC-002 | Non-member User | Group ACTIVE, User has no membership | 403 Forbidden | Blocked with access denied message. |
| TC-GC-003 | Left Member | Group ACTIVE, Membership status = `LEFT` | 403 Forbidden | Blocked from accessing history. |
| TC-GC-004 | Removed Member | Group ACTIVE, Membership status = `REMOVED` | 403 Forbidden | Blocked from accessing history. |
| TC-GC-005 | Active Member | Group ACTIVE, Membership status = `ACTIVE` | 200 OK | Returns list of ACTIVE messages for this group. |
| TC-GC-006 | Active Member | Group `DELETED` | 404 Not Found | Returns group not found or deleted message. |
| TC-GC-007 | Active Member | Group does not exist | 404 Not Found | Returns group not found or deleted message. |

### 1.2. Message Retrieval Logic (GET /api/groups/{groupId}/messages)

| TC | Parameter | Condition | Expected HTTP | Expected Behavior / Data Format |
|---|---|---|---|---|
| TC-GC-010 | None | Group has 60 messages | 200 OK | Returns latest 50 ACTIVE messages, ordered by `createdAt` ASC. (Older messages are sliced off). |
| TC-GC-011 | `limit = 80` | Group has 100 messages | 200 OK | Returns latest 80 ACTIVE messages. |
| TC-GC-012 | `limit = 120` | Group has 150 messages | 200 OK | Limits response count to max 100 messages. |
| TC-GC-013 | `afterMessageId = 40` | Incremental retrieval supported | 200 OK | (Optional) Returns only messages with `messageId > 40`. |
| TC-GC-014 | `afterMessageId = 40` | Incremental not supported | 200 OK | (Fallback) Returns latest 50 messages. (Does not block Step 12 completion). |
| TC-GC-015 | None | Valid messages list | 200 OK | Returns fields: `messageId` (BIGINT), `groupId` (INT), `senderId` (INT), `senderName`, `senderRole` (OWNER/MEMBER), `content`, `status` ("ACTIVE"), `isMine` (boolean, matches caller userId), and `createdAt` as ISO 8601 string. |
| TC-GC-016 | None | Has inactive messages | 200 OK | Only returns messages with `status = "ACTIVE"`. Messages with status = "DELETED" are excluded. |

### 1.3. Send Message — POST /api/groups/{groupId}/messages

| TC | Actor | Request Payload | Expected HTTP | Expected Post-Condition (Database & Response) |
|---|---|---|---|---|
| TC-GC-020 | Guest | `{"content": "Hello"}` | 401 Unauthorized | Blocked from sending. |
| TC-GC-021 | Non-member | `{"content": "Hello"}` | 403 Forbidden | Blocked from sending. |
| TC-GC-022 | Left Member | `{"content": "Hello"}` | 403 Forbidden | Blocked from sending. |
| TC-GC-023 | Active Member | `{"content": "  Welcome to group!  "}` | 200 OK | Content is trimmed to `"Welcome to group!"` before saving. `status = "ACTIVE"`, `created_at` = current time, `updated_at` = `created_at`, `deleted_at = null`, `isMine = true`. |
| TC-GC-024 | Active Member | `{"content": ""}` | 400 Bad Request | Empty message content is rejected. |
| TC-GC-025 | Active Member | `{"content": "     "}` | 400 Bad Request | Blank messages (spaces only) are rejected. |
| TC-GC-026 | Active Member | `{"content": "[1001 characters]"}` | 400 Bad Request | Messages exceeding 1000 characters are rejected. |
| TC-GC-027 | Active Member | `{"content": "<script>alert('xss')</script>"}` | 200 OK | Content is stored as plain text. Frontend renders with textContent, so script is not executed. |
| TC-GC-028 | Active Member | Deleted Group `11` | 404 Not Found | Message is not saved; returns group not found/deleted. |

---

## 2. Frontend Verification Test Cases

### 2.1. UI Components and Render Controls

| TC | Action / State | Condition | Expected UI Behavior |
|---|---|---|---|
| TC-GC-030 | Open group detail | User is active member | "Chat" tab is visible alongside Members/Documents tabs. |
| TC-GC-031 | Click Chat tab | First loading | Loading spinner is shown, followed by message list rendering. |
| TC-GC-032 | Load empty chat | No messages in group | Displays a friendly empty state message (e.g. "No messages yet. Say hi to start the conversation!"). |
| TC-GC-033 | Click Chat tab | Access denied (403/404) | Displays an explicit error state message (e.g. "You do not have permission to view this group chat"). |
| TC-GC-034 | View message item | Valid message data | Renders: Sender Name, Role Badge (`OWNER` or `MEMBER`), message text, and locally formatted timestamp (e.g. `10:30` or `03/07/2026 10:30`). |
| TC-GC-035 | Layout alignments | My message vs Other message | My messages are aligned to the right (distinct background color); other members' messages are aligned to the left. |
| TC-GC-036 | HTML Content | Message contains HTML tags | Text is rendered literally (uses `textContent` or escapes HTML). Injected scripts do NOT run (no `innerHTML` usage). |

### 2.2. Polling and Sync Controls

| TC | Scenario | Action | Expected UI Behavior |
|---|---|---|---|
| TC-GC-040 | Initial Load | Enter page | Auto-scrolls to the bottom of the chat list after initial messages are loaded. |
| TC-GC-041 | REST Polling | Active page session | Initiates a background polling timer calling `getGroupMessages` every 5 seconds. |
| TC-GC-042 | Duplicate Check | Polling response arrives | Frontend merges messages by `messageId` to ensure no duplicates are appended. Chronological order (`createdAt` ASC) is maintained. |
| TC-GC-043 | Navigation | User leaves the page | Polling interval is cleared (`clearInterval` called). No leaked network calls in other views. |
| TC-GC-044 | Error State | Polling gets 403 or 404 | Stops background polling immediately and displays error state. |

### 2.3. Message Submission Guard

| TC | Scenario | Action | Expected UI Behavior |
|---|---|---|---|
| TC-GC-050 | Send Message | Click Send | - Trims the text input. If empty, blocks request locally.<br>- Disables Send button and input box during HTTP submission.<br>- Re-enables elements upon success/failure response. |
| TC-GC-051 | Double-click | Double-click Send button | Only a single POST request is dispatched (duplicate requests blocked by the disabled state/sending lock). |
| TC-GC-052 | Success send | API returns 200 OK | - Appends the new message to the list.<br>- Clears the input field.<br>- Smoothly scrolls the chat container to the bottom. |
