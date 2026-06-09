// document-detail.js – FE2: Document Detail & Edit Page

// Fix #3: showFatalError queries DOM directly to avoid ReferenceError
// when detailLoader variable is not yet declared
function showFatalError(message) {
    const loader = document.getElementById("detailLoader");
    if (loader) {
        loader.textContent = message;
        loader.style.color = "var(--danger)";
    }
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const detailLoader = document.getElementById("detailLoader");
const detailContent = document.getElementById("detailContent");

// ── State ─────────────────────────────────────────────────────────────────────
let currentDocumentId = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        showFatalError("No document ID provided. Please open this page from your Dashboard.");
        return;
    }

    currentDocumentId = id;
    loadPage(id);
});

// ── Load document detail + subjects in parallel ────────────────────────────
async function loadPage(id) {
    try {
        const [docRes, subjectsRes] = await Promise.all([
            getDocumentById(id),
            getSubjects()
        ]);

        renderDocument(docRes.data);
        renderSubjectOptions(subjectsRes.data, docRes.data.subjectId);

        detailLoader.style.display = "none";
        detailContent.style.display = "block";
    } catch (err) {
        showFatalError(err.message || "Failed to load document.");
    }
}

// ── Render document info ──────────────────────────────────────────────────────
function renderDocument(doc) {
    document.getElementById("fileTypeBadge").textContent = doc.fileType || "–";
    document.getElementById("docTitle").textContent = doc.title || "–";
    document.getElementById("docUploadedBy").textContent = "Uploaded by " + (doc.uploadedBy || "–");
    document.getElementById("docDescription").textContent = doc.description || "No description provided.";
    document.getElementById("docSubject").textContent = doc.subjectCode
        ? `${doc.subjectCode} – ${doc.subjectName}`
        : "No subject";
    document.getElementById("docFileSize").textContent = formatFileSize(doc.fileSize);
    document.getElementById("docCreatedAt").textContent = formatDate(doc.createdAt);

    const openBtn = document.getElementById("openFileBtn");
    if (doc.fileUrl) {
        openBtn.href = doc.fileUrl;
    } else {
        openBtn.style.display = "none";
    }

    // Pre-fill edit form
    document.getElementById("editTitle").value = doc.title || "";
    document.getElementById("editDescription").value = doc.description || "";
}

// ── Render subject dropdown ───────────────────────────────────────────────────
function renderSubjectOptions(subjects, currentSubjectId) {
    const select = document.getElementById("editSubject");
    select.innerHTML = "";

    // Fix #4: No "— No subject —" option (backend does not support null subjectId update)
    subjects.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.subjectId;
        opt.textContent = `${s.subjectCode} – ${s.subjectName}`;
        if (s.subjectId === currentSubjectId) opt.selected = true;
        select.appendChild(opt);
    });

    // If document has no subject, add a disabled placeholder
    if (!currentSubjectId) {
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.textContent = "— Select a subject —";
        select.insertBefore(placeholder, select.firstChild);
    }
}

// ── Save changes ──────────────────────────────────────────────────────────────
async function handleSave() {
    const title = document.getElementById("editTitle").value.trim();
    const description = document.getElementById("editDescription").value.trim();
    const subjectId = document.getElementById("editSubject").value;

    if (!title) {
        showEditMessage("Title is required.", "error");
        return;
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const payload = { title, description };
        if (subjectId) payload.subjectId = parseInt(subjectId, 10);

        const res = await updateDocument(currentDocumentId, payload);

        // Refresh display with updated data
        renderDocument(res.data);
        showEditMessage("", "");
        showToast("Changes saved successfully.", "success");
    } catch (err) {
        showEditMessage(err.message || "Failed to save changes.", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
    }
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function showDeleteConfirm() {
    document.getElementById("deleteModal").classList.add("show");
}

function hideDeleteConfirm() {
    document.getElementById("deleteModal").classList.remove("show");
}

async function handleDelete() {
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Deleting...";

    try {
        await deleteDocument(currentDocumentId);
        hideDeleteConfirm();
        showToast("Document deleted.", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);
    } catch (err) {
        hideDeleteConfirm();
        showToast(err.message || "Failed to delete document.", "error");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Delete";
    }
}

// ── Edit message helper ───────────────────────────────────────────────────────
function showEditMessage(text, type) {
    const el = document.getElementById("editMessage");
    el.textContent = text;
    el.className = "helper-text" + (type === "error" ? " error" : type === "success" ? " success" : "");
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "show toast-" + type;
    setTimeout(() => {
        toast.className = "";
    }, 3000);
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatFileSize(bytes) {
    if (!bytes) return "–";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(isoString) {
    if (!isoString) return "–";
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Logout logic ─────────────────────────────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("accessToken");
        window.location.href = "login.html";
    });
}