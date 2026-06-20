// document-detail.js – FE2: Document Detail & Edit Page
// Standardized UI styles and theme configurations.

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
    initSharingUI();
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

    // Since GET /api/documents/{id} is only accessible by the owner,
    // a successful load implies the current user is the owner.
    const isOwner = true;

    // Show share controls and management panel only to the owner
    const shareBtn = document.getElementById("shareBtn");
    const sharesPanel = document.getElementById("sharesPanel");
    if (isOwner) {
        shareBtn.style.display = "inline-block";
        sharesPanel.style.display = "block";
        loadSharingInfo(doc.documentId);
    } else {
        shareBtn.style.display = "none";
        sharesPanel.style.display = "none";
    }

    // Hide edit and delete options for non-owners
    const editSec = document.querySelector(".edit-section");
    if (editSec) {
        editSec.style.display = isOwner ? "block" : "none";
    }
}

// ── Render subject dropdown ───────────────────────────────────────────────────
function renderSubjectOptions(subjects, currentSubjectId) {
    const select = document.getElementById("editSubject");
    select.innerHTML = "";

    subjects.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.subjectId;
        opt.textContent = `${s.subjectCode} – ${s.subjectName}`;
        if (s.subjectId === currentSubjectId) opt.selected = true;
        select.appendChild(opt);
    });

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

// ── Modal overlay hide ──────────────────────────────────────────────────────
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

// ── Sharing UI & Logic ─────────────────────────────────────────────────────────
function initSharingUI() {
    const shareBtn = document.getElementById("shareBtn");
    const shareModal = document.getElementById("shareModal");

    const tabUserBtn = document.getElementById("tabUserBtn");
    const tabGroupBtn = document.getElementById("tabGroupBtn");
    const tabUserContent = document.getElementById("tabUserContent");
    const tabGroupContent = document.getElementById("tabGroupContent");

    const shareUserEmail = document.getElementById("shareUserEmail");
    const shareGroupSelect = document.getElementById("shareGroupSelect");

    // Tab switching
    tabUserBtn.addEventListener("click", () => {
        tabUserBtn.classList.add("active");
        tabUserBtn.style.borderBottomColor = "var(--primary)";
        tabUserBtn.style.color = "var(--primary)";

        tabGroupBtn.classList.remove("active");
        tabGroupBtn.style.borderBottomColor = "transparent";
        tabGroupBtn.style.color = "var(--muted)";

        tabUserContent.style.display = "block";
        tabGroupContent.style.display = "none";
    });

    tabGroupBtn.addEventListener("click", () => {
        tabGroupBtn.classList.add("active");
        tabGroupBtn.style.borderBottomColor = "var(--primary)";
        tabGroupBtn.style.color = "var(--primary)";

        tabUserBtn.classList.remove("active");
        tabUserBtn.style.borderBottomColor = "transparent";
        tabUserBtn.style.color = "var(--muted)";

        tabGroupContent.style.display = "block";
        tabUserContent.style.display = "none";
    });

    // Modal display
    shareBtn.addEventListener("click", async () => {
        shareUserEmail.value = "";
        document.getElementById("shareUserError").style.display = "none";
        document.getElementById("shareGroupError").style.display = "none";
        shareModal.classList.add("show");

        // Populating dropdown groups
        shareGroupSelect.innerHTML = '<option value="" disabled selected>Loading groups...</option>';
        try {
            const res = await getMyGroups();
            const groups = Array.isArray(res.data) ? res.data : [];
            shareGroupSelect.innerHTML = "";
            if (groups.length === 0) {
                const opt = document.createElement("option");
                opt.value = "";
                opt.disabled = true;
                opt.selected = true;
                opt.textContent = "No groups available";
                shareGroupSelect.appendChild(opt);
            } else {
                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.disabled = true;
                placeholder.selected = true;
                placeholder.textContent = "— Select a group —";
                shareGroupSelect.appendChild(placeholder);

                groups.forEach(g => {
                    const opt = document.createElement("option");
                    opt.value = g.groupId;
                    opt.textContent = g.groupName;
                    shareGroupSelect.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
            shareGroupSelect.innerHTML = '<option value="" disabled>Failed to load groups</option>';
        }
    });

    // Close buttons
    document.getElementById("shareUserCancelBtn").addEventListener("click", () => {
        shareModal.classList.remove("show");
    });
    document.getElementById("shareGroupCancelBtn").addEventListener("click", () => {
        shareModal.classList.remove("show");
    });
    shareModal.addEventListener("click", (e) => {
        if (e.target === shareModal) shareModal.classList.remove("show");
    });

    // Confirm buttons
    document.getElementById("shareUserConfirmBtn").addEventListener("click", async () => {
        const email = shareUserEmail.value.trim();
        const errorEl = document.getElementById("shareUserError");
        if (!email) {
            errorEl.textContent = "Email is required.";
            errorEl.style.display = "block";
            return;
        }
        errorEl.style.display = "none";
        try {
            await shareDocumentToUser(currentDocumentId, email);
            shareModal.classList.remove("show");
            showToast("Document shared successfully.", "success");
            loadSharingInfo(currentDocumentId);
        } catch (err) {
            errorEl.textContent = err.message || "Failed to share document.";
            errorEl.style.display = "block";
        }
    });

    document.getElementById("shareGroupConfirmBtn").addEventListener("click", async () => {
        const groupId = shareGroupSelect.value;
        const errorEl = document.getElementById("shareGroupError");
        if (!groupId) {
            errorEl.textContent = "Please select a group.";
            errorEl.style.display = "block";
            return;
        }
        errorEl.style.display = "none";
        try {
            await shareDocumentToGroup(currentDocumentId, parseInt(groupId, 10));
            shareModal.classList.remove("show");
            showToast("Document shared to group successfully.", "success");
            loadSharingInfo(currentDocumentId);
        } catch (err) {
            errorEl.textContent = err.message || "Failed to share to group.";
            errorEl.style.display = "block";
        }
    });
}

// ── Load shares information ──────────────────────────────────────────────────
async function loadSharingInfo(docId) {
    try {
        const [sharesRes, groupsRes] = await Promise.all([
            getDocumentShares(docId),
            getMyGroups()
        ]);

        const groupMap = {};
        if (groupsRes && groupsRes.data) {
            groupsRes.data.forEach(g => {
                groupMap[g.groupId] = g.groupName;
            });
        }

        const info = sharesRes.data || { userShares: [], groupShares: [] };
        const userShares = Array.isArray(info.userShares) ? info.userShares : [];
        const groupShares = Array.isArray(info.groupShares) ? info.groupShares : [];

        // Direct shares list
        const directList = document.getElementById("directSharesList");
        const noDirect = document.getElementById("noDirectShares");
        directList.innerHTML = "";
        if (userShares.length === 0) {
            noDirect.style.display = "block";
        } else {
            noDirect.style.display = "none";
            userShares.forEach(item => {
                const row = document.createElement("div");
                row.className = "member-row";

                const main = document.createElement("div");
                main.className = "member-row-main";

                const name = document.createElement("span");
                name.className = "member-row-name";
                name.textContent = item.sharedWithEmail;

                const badge = document.createElement("span");
                badge.className = "badge badge-success";
                badge.textContent = item.status;

                main.append(name, badge);
                row.appendChild(main);

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn btn-danger btn-sm";
                btn.textContent = "Revoke";
                btn.addEventListener("click", () => handleRevokeDirect(item.shareId));
                row.appendChild(btn);

                directList.appendChild(row);
            });
        }

        // Group shares list
        const groupList = document.getElementById("groupSharesList");
        const noGroup = document.getElementById("noGroupShares");
        groupList.innerHTML = "";
        if (groupShares.length === 0) {
            noGroup.style.display = "block";
        } else {
            noGroup.style.display = "none";
            groupShares.forEach(item => {
                const row = document.createElement("div");
                row.className = "member-row";

                const main = document.createElement("div");
                main.className = "member-row-main";

                const name = document.createElement("span");
                name.className = "member-row-name";
                name.textContent = groupMap[item.groupId] || `Group (ID: ${item.groupId})`;

                const badge = document.createElement("span");
                badge.className = "badge badge-success";
                badge.textContent = item.status;

                main.append(name, badge);
                row.appendChild(main);

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn btn-danger btn-sm";
                btn.textContent = "Revoke";
                btn.addEventListener("click", () => handleRevokeGroup(item.shareId));
                row.appendChild(btn);

                groupList.appendChild(row);
            });
        }
    } catch (err) {
        console.error("Failed to load sharing details", err);
    }
}

// ── Revoke Actions ────────────────────────────────────────────────────────────
async function handleRevokeDirect(shareId) {
    const confirmed = confirm("Are you sure you want to revoke this direct share?");
    if (!confirmed) return;
    try {
        await revokeDocumentShare(shareId);
        showToast("Share revoked successfully.", "success");
        loadSharingInfo(currentDocumentId);
    } catch (err) {
        showToast(err.message || "Failed to revoke share.", "error");
    }
}

async function handleRevokeGroup(shareId) {
    const confirmed = confirm("Are you sure you want to revoke this group share?");
    if (!confirmed) return;
    try {
        await revokeGroupDocumentShare(shareId);
        showToast("Group share revoked successfully.", "success");
        loadSharingInfo(currentDocumentId);
    } catch (err) {
        showToast(err.message || "Failed to revoke group share.", "error");
    }
}
