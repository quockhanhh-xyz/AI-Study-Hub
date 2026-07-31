# AI Study Hub UI Audit Overview

## 1. Current screens in the frontend

- `frontend/login.html`
  - Centered auth card
  - Email and password inputs
  - Primary CTA and secondary text links

- `frontend/register.html`
  - Same auth shell as login
  - Longer form with name, email, password, confirm password

- `frontend/verify-otp.html`
  - Same auth shell
  - One OTP input
  - Primary verify CTA and secondary resend CTA

- `frontend/dashboard.html`
  - Sidebar layout
  - Search bar in top header
  - Stats cards
  - Folder preview section
  - Recent documents section with filters

- `frontend/folders.html`
  - Sidebar layout
  - Folder list view
  - Folder detail/documents view
  - Create, rename, delete modals

- `frontend/upload.html`
  - Sidebar layout
  - Back link
  - Upload form
  - Drag and drop file zone
  - Progress feedback

- `frontend/document-detail.html`
  - Sidebar layout
  - Detail card with metadata
  - Edit form
  - Delete confirmation modal
  - Toast feedback

- `frontend/trash.html`
  - Sidebar layout
  - Deleted folders section
  - Deleted documents section
  - Restore/delete actions

## 2. Current visual language

- Dark-first interface using `--bg-dark`, `--card-dark`, `--text-main`, `--primary`
- Glass-like sidebar with blur and thin borders
- Rounded cards and controls, mostly `12px` to `16px` radius
- Purple gradient primary CTA
- Reusable card, button, input, badge, empty-state, and grid patterns

## 3. What is working well

- Consistent dark theme across most pages
- Shared layout shell for the main app pages
- Reusable component classes in `frontend/css/style.css`
- Clear CRUD flow for documents and folders
- Auth flow is visually consistent and easy to follow

## 4. Main UI issues found

- Information hierarchy is uneven between pages
  - `dashboard.html` feels more polished than `document-detail.html`
  - Some headers are strong, some are visually flat

- Detail page styling drifts from the main system
  - `frontend/document-detail.html` includes page-local styles
  - A few colors and modal styles feel lighter and less aligned with the dark app shell

- Sidebar navigation is stable, but page-level actions are not standardized
  - Back link, section CTA, and destructive actions move around between pages

- Cards are visually similar but semantically overloaded
  - Stat cards, document cards, folder cards, and form cards all use similar weight
  - This reduces scan speed on larger pages

- Empty, loading, and error states are present but not always equally expressive
  - The system works, but feedback is sometimes generic

## 5. Recommended upgrade priorities

### Priority 1: unify the design system

- Move `document-detail.html` page-specific visual rules into the shared CSS system
- Standardize modal, toast, and metadata card tokens
- Create one consistent header pattern for:
  - page title
  - subtitle
  - primary action
  - secondary action

### Priority 2: improve hierarchy and spacing

- Make the dashboard the baseline for spacing rhythm
- Increase contrast between:
  - page sections
  - data cards
  - form surfaces
  - support text

- Introduce clearer typography levels:
  - page title
  - section title
  - card title
  - metadata label
  - helper text

### Priority 3: strengthen document management flows

- Turn document cards into a more structured pattern:
  - title
  - subject/folder label
  - description
  - metadata row
  - action group

- Improve folder navigation clarity with stronger breadcrumb and active state
- Make destructive actions more visually distinct from standard secondary actions

### Priority 4: improve perceived quality

- Add a stronger visual hero area or welcome strip on dashboard
- Refine hover states so cards feel more interactive
- Use more intentional icons for empty, upload, trash, and folder states
- Normalize success/error/status feedback components

## 6. Suggested next redesign direction

If we redesign from the current codebase, the safest upgrade path is:

1. Build a shared page-header component pattern
2. Standardize form, modal, and detail layouts
3. Redesign dashboard and folders first
4. Bring upload, trash, and document detail into the same visual system

## 7. Figma status

- A Figma file was created for this audit:
  - `AI Study Hub - Current UI Overview`
- Current file URL:
  - `https://www.figma.com/design/rIj3mlOVjuDo6sicaxCex9`
- The board skeleton was created successfully
- Further Figma population was blocked by the Starter plan MCP tool-call limit
