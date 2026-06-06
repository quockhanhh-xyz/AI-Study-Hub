# 📚 AI Study Hub

> **Vision:** A simplified integration of Google Drive + Studocu + Quizlet + AI Study Assistant.

**AI Study Hub** is a centralized learning platform that empowers students to manage, share, and interact with study materials using an AI-powered assistant. The system provides smart document management, collaborative study groups, and automated quiz/flashcard generation to enhance the learning experience.

---

## 🌟 1. Core Features

**📂 Document Management & Cloud Storage**

* **Upload & Organize:** Support PDF, DOCX, PPTX, TXT, Images, and ZIP. Files are stored securely on **Cloudinary Storage**, while metadata (title, size, subject) sits in **MySQL**.
* **Search & Filter:** Find materials instantly by keyword, subject, folder, or file type.
* **Sharing:** Share specific documents with registered peers via access permissions.

**🤖 AI-Powered Learning (GPT / Claude API)**

* **Contextual Chatbot:** Ask questions and get answers strictly based on the uploaded document's context.
* **Smart Generators:** Automatically generate quizzes and flashcards from study materials.
* **Usage Limits (Freemium):** Daily AI interaction limits for Free users, with higher quotas for Premium users. *(Note: AI chat history is ephemeral in the MVP).*

**👥 Collaborative Study Groups**

* Create or join study groups to share resources.
* Group members can chat, discuss, and trigger AI assistance directly within the group context *(Group chat history is not stored in the DB for the MVP).*

**⚙️ Administration & Security**

* Role-based access control (Guest, User, Premium, Admin).
* Admin portal to manage users, moderate flagged documents, configure system limits, and view analytics.

---

## 🛠️ 2. Tech Stack

| Layer | Technology | Tools & Environments |
| --- | --- | --- |
| **Frontend** | HTML, CSS, JavaScript | VS Code (Live Server: `http://127.0.0.1:5500`) |
| **Backend** | Java Spring Boot | IntelliJ IDEA (Port: `http://localhost:8080`) |
| **Database** | MySQL | Spring Data JPA |
| **Integrations** | Cloudinary Storage, OpenAI / Claude API | RESTful APIs, Fetch API |

---

## 🏗️ 3. Project Structure

```text
ai-study-hub/
├── backend/                  # Spring Boot source code
│   └── src/main/java/com/aistudyhub/
│       ├── config/           # CORS, Security configs
│       ├── controller/       # REST API Endpoints (/api/...)
│       ├── service/          # Business logic
│       ├── repository/       # Database interactions
│       └── entity/           # MySQL table mappings
├── frontend/                 # Vanilla JS, HTML, CSS
│   ├── css/                  # style.css (Tailwind/Custom)
│   ├── js/                   # api.js (Centralized API calls), auth.js, etc.
│   └── *.html                # login, dashboard, upload, etc.
├── docs/                     # API contracts, ERD, and Git workflows
├── demo-data/                # Sample files and SQL mock data
└── README.md

```

---

## 📜 4. Development Standards & Rules

### Backend Contract (`localhost:8080`)

* All endpoints must be prefixed with `/api`.
* Strict camelCase for JSON fields.
* **Standardized JSON Response:**
```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": { ... }
}

```



### Frontend Architecture (`127.0.0.1:5500`)

* **NO hard-coded API URLs** across files. All requests must route through `frontend/js/api.js`.
* **UI/UX Guidelines:** * *Primary Color:* `#2563eb` (Blue) | *Background:* `#f8fafc` | *Text:* `#1e293b`.
* *Styling:* Inter font, 8px border-radius, clean card layouts with consistent spacing.



### Data Flow

`User Action` ➔ `Frontend JS` ➔ `Fetch API` ➔ `Spring Boot REST API` ➔ `MySQL / Cloudinary / AI API` ➔ `JSON Response` ➔ `UI Update`.

---

## 🌿 5. Git Workflow

We strictly follow a feature-branch workflow to maintain a stable codebase.

* `main`: Production-ready code (DO NOT push directly).
* `develop`: Active integration branch.
* `feature/*`: Specific task branches (e.g., `feature/login-ui`, `feature/upload-api`).
* **Rule:** All merges to `develop` require a **Pull Request (PR)** reviewed by the Leader.

---
