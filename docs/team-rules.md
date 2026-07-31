# Team Rules - AI Study Hub

## 1. Backend Rules

- Backend runs at http://localhost:8080.
- All APIs start with /api.
- API response must use: success, message, data.
- JSON fields use camelCase.
- Backend code follows package structure:
    - controller
    - service
    - repository
    - entity
    - dto
    - config
    - exception
    - util
- Backend APIs must be tested with Postman before marking as done.

## 2. Frontend Rules

- Frontend uses HTML, CSS, JavaScript.
- Frontend runs with VS Code Live Server.
- Frontend usually runs at http://127.0.0.1:5500.
- All API calls must go through frontend/js/api.js.
- Do not hard-code backend URLs in multiple files.
- Use shared CSS in frontend/css/style.css.

## 3. UI Rules

- Main color: #2563eb
- Background: #f8fafc
- Text: #1e293b
- Border radius: 8px
- Font: Inter, Arial, sans-serif
- Layout: sidebar dashboard + main content area

## 4. API Rules

- API must be written in docs/api-contract.md before coding.
- Backend must not change endpoint or response fields without informing frontend.
- Frontend must not guess API endpoints.
- Both BE and FE must follow the API contract.

## 5. Git Rules

- Do not push directly to main.
- Work on feature branches.
- Create Pull Request into develop.
- Leader reviews before merging.