/**
 * document-detail.js
 * FE2 – Document Detail + Edit Page
 *
 * Reads ?id=<documentId> from the URL, then:
 *   - Fetches document detail via document-api.js
 *   - Renders all metadata on screen
 *   - Handles Open File / Download
 *   - Handles Edit Metadata (title, description, subject) with save
 *   - Handles Delete with a confirm modal (soft-delete)
 */

document.addEventListener("DOMContentLoaded", async function () {

    // ─────────────────────────────────────────────────────────────
    // AUTH GUARD
    // ─────────────────────────────────────────────────────────────
    const currentUserRaw = localStorage.getItem("currentUser");
    if (!currentUserRaw) {
        window.location.href = "login.html";
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // READ DOCUMENT ID FROM QUERY STRING
    // ─────────────────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const documentId = params.get("id");

    if (!documentId) {
        showFatalError("No document ID provided. Please go back to the dashboard.");
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // DOM REFERENCES
    // ─────────────────────────────────────────────────────────────
    const detailLoader    = document.getElementById("detailLoader");
    const detailContent   = document.getElementById("detailContent");
    const pageMessage     = document.getElementById("pageMessage");
    const editMessage     = document.getElementById("editMessage");

    // Info card
    const detailFileType   = document.getElementById("detailFileType");
    const detailTitle      = document.getElementById("detailTitle");
    const detailFileName   = document.getElementById("detailFileName");
    const detailFileSize   = document.getElementById("detailFileSize");
    const detailCreatedAt  = document.getElementById("detailCreatedAt");
    const detailSubject    = document.getElementById("detailSubject");
    const detailUploadedBy = document.getElementById("detailUploadedBy");
    const detailDescription = document.getElementById("detailDescription");

    // Action buttons
    const openFileBtn   = document.getElementById("openFileBtn");
    const downloadFileBtn = document.getElementById("downloadFileBtn");
    const toggleEditBtn = document.getElementById("toggleEditBtn");
    const deleteBtn     = document.getElementById("deleteBtn");

    // Edit section
    const editSection    = document.getElementById("editSection");
    const editTitle      = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editSubject    = document.getElementById("editSubject");
    const saveEditBtn    = document.getElementById("saveEditBtn");
    const cancelEditBtn  = document.getElementById("cancelEditBtn");

    // Delete modal
    const deleteModal      = document.getElementById("deleteModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const cancelDeleteBtn  = document.getElementById("cancelDeleteBtn");

    // ─────────────────────────────────────────────────────────────
    // UTILITY HELPERS
    // ─────────────────────────────────────────────────────────────

    /** Format bytes → human-readable string */
    function formatFileSize(bytes) {
        if (bytes === undefined || bytes === null) return "—";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /** Format ISO timestamp → "01 Jan 2023, 12:00 PM" */
    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    /**
     * Show a feedback message on the page level.
     * @param {string} message
     * @param {"success"|"error"} type
     */
    function showPageMessage(message, type) {
        pageMessage.textContent = message;
        pageMessage.className = `page-message ${type}`;
        // Auto-clear success messages after 4 seconds
        if (type === "success") {
            setTimeout(() => {
                pageMessage.className = "page-message";
                pageMessage.textContent = "";
            }, 4000);
        }
    }

    /**
     * Show a feedback message inside the edit form area.
     * @param {string} message
     * @param {"success"|"error"} type
     */
    function showEditMessage(message, type) {
        editMessage.textContent = message;
        editMessage.className = `page-message ${type}`;
    }

    function clearEditMessage() {
        editMessage.textContent = "";
        editMessage.className = "page-message";
    }

    /**
     * Show a fatal/unrecoverable error and hide the loader.
     * @param {string} message
     */
    function showFatalError(message) {
        if (detailLoader) {
            detailLoader.textContent = message;
            detailLoader.style.color = "var(--danger)";
        }
    }

    /** Toggle a button's loading state */
    function setButtonLoading(btn, isLoading, loadingText = "Processing...") {
        if (!btn) return;
        if (!btn.dataset.originalText) {
            btn.dataset.originalText = btn.textContent;
        }
        btn.disabled = isLoading;
        btn.textContent = isLoading ? loadingText : btn.dataset.originalText;
    }

    // ─────────────────────────────────────────────────────────────
    // RENDER DOCUMENT DETAIL
    // ─────────────────────────────────────────────────────────────

    /**
     * Populate the info card with document data (display only).
     * Does NOT attach event listeners — those are wired once via wireFileButtons().
     */
    function renderDocument(doc) {
        document.title = `${doc.title || "Document"} – AI Study Hub`;

        detailFileType.textContent   = (doc.fileType || "FILE").toUpperCase();
        detailTitle.textContent      = doc.title || doc.originalFileName || "Untitled Document";
        detailFileName.textContent   = doc.originalFileName || "—";
        detailFileSize.textContent   = formatFileSize(doc.fileSize);
        detailCreatedAt.textContent  = formatDate(doc.createdAt);
        detailUploadedBy.textContent = doc.uploadedBy || "—";

        // Subject display
        if (doc.subjectCode && doc.subjectName) {
            detailSubject.textContent = `${doc.subjectCode} – ${doc.subjectName}`;
        } else if (doc.subjectName) {
            detailSubject.textContent = doc.subjectName;
        } else {
            detailSubject.textContent = "None";
        }

        // Description
        if (doc.description && doc.description.trim()) {
            detailDescription.textContent = doc.description;
            detailDescription.classList.remove("muted");
        } else {
            detailDescription.textContent = "No description provided.";
            detailDescription.classList.add("muted");
        }

        // Show/hide Open & Download based on fileUrl
        openFileBtn.style.display     = doc.fileUrl ? "" : "none";
        downloadFileBtn.style.display = doc.fileUrl ? "" : "none";
    }

    /**
     * Wire Open File and Download buttons ONCE after initial load.
     * Reads currentDoc at click-time so always uses the latest fileUrl.
     */
    function wireFileButtons() {
        openFileBtn.addEventListener("click", function () {
            if (currentDoc && currentDoc.fileUrl) {
                window.open(currentDoc.fileUrl, "_blank", "noopener");
            }
        });

        downloadFileBtn.addEventListener("click", function () {
            if (!currentDoc || !currentDoc.fileUrl) return;
            const link = document.createElement("a");
            link.href     = currentDoc.fileUrl;
            link.download = currentDoc.originalFileName || "document";
            link.target   = "_blank";
            link.rel      = "noopener";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // LOAD SUBJECTS INTO SELECT
    // ─────────────────────────────────────────────────────────────

    /**
     * Fetch all active subjects and populate the <select>.
     * Pre-selects the subject that belongs to the current document.
     * @param {number|null} currentSubjectId
     */
    async function loadSubjectsIntoSelect(currentSubjectId) {
        try {
            const result = await getSubjects();
            const subjects = Array.isArray(result.data) ? result.data : [];

            subjects.forEach(function (subject) {
                const option = document.createElement("option");
                option.value = subject.subjectId;
                option.textContent = `${subject.subjectCode} – ${subject.subjectName}`;
                if (subject.subjectId === currentSubjectId) {
                    option.selected = true;
                }
                editSubject.appendChild(option);
            });
        } catch (error) {
            console.warn("Failed to load subjects for edit form:", error.message);
            // Non-fatal: user can still edit title and description
        }
    }

    // ─────────────────────────────────────────────────────────────
    // EDIT SECTION TOGGLE
    // ─────────────────────────────────────────────────────────────

    /** Populate edit form fields from the current in-memory document object */
    function populateEditForm(doc) {
        editTitle.value       = doc.title || "";
        editDescription.value = doc.description || "";

        // Reset subject select to blank first (subjects may not be loaded yet)
        editSubject.value = doc.subjectId ? String(doc.subjectId) : "";
    }

    toggleEditBtn.addEventListener("click", function () {
        const isVisible = editSection.classList.contains("visible");
        if (isVisible) {
            editSection.classList.remove("visible");
            toggleEditBtn.textContent = "Edit Metadata";
        } else {
            editSection.classList.add("visible");
            toggleEditBtn.textContent = "Close Editor";
            clearEditMessage();
            // Re-populate in case doc was just updated
            populateEditForm(currentDoc);
            editTitle.focus();
        }
    });

    cancelEditBtn.addEventListener("click", function () {
        editSection.classList.remove("visible");
        toggleEditBtn.textContent = "Edit Metadata";
        clearEditMessage();
    });

    // ─────────────────────────────────────────────────────────────
    // SAVE EDIT (PUT /api/documents/{id})
    // ─────────────────────────────────────────────────────────────

    saveEditBtn.addEventListener("click", async function () {
        clearEditMessage();

        const newTitle       = editTitle.value.trim();
        const newDescription = editDescription.value.trim();
        const subjectValue   = editSubject.value;
        const newSubjectId   = subjectValue ? Number(subjectValue) : null;

        // Client-side validation
        if (!newTitle) {
            showEditMessage("Title is required.", "error");
            editTitle.focus();
            return;
        }

        setButtonLoading(saveEditBtn, true, "Saving...");

        try {
            const payload = {
                title: newTitle,
                description: newDescription || null,
                subjectId: newSubjectId
            };

            const result = await updateDocument(documentId, payload);

            // Update in-memory document so the info card stays consistent
            currentDoc = result.data;
            renderDocument(currentDoc);

            // Close the edit panel
            editSection.classList.remove("visible");
            toggleEditBtn.textContent = "Edit Metadata";
            showPageMessage("Document updated successfully.", "success");
        } catch (error) {
            showEditMessage(error.message || "Failed to save changes. Please try again.", "error");
        } finally {
            setButtonLoading(saveEditBtn, false);
        }
    });

    // ─────────────────────────────────────────────────────────────
    // DELETE – CONFIRM MODAL FLOW
    // ─────────────────────────────────────────────────────────────

    deleteBtn.addEventListener("click", function () {
        deleteModal.classList.add("visible");
        confirmDeleteBtn.focus();
    });

    cancelDeleteBtn.addEventListener("click", function () {
        deleteModal.classList.remove("visible");
    });

    // Close modal when clicking outside the box
    deleteModal.addEventListener("click", function (e) {
        if (e.target === deleteModal) {
            deleteModal.classList.remove("visible");
        }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && deleteModal.classList.contains("visible")) {
            deleteModal.classList.remove("visible");
        }
    });

    confirmDeleteBtn.addEventListener("click", async function () {
        setButtonLoading(confirmDeleteBtn, true, "Deleting...");

        try {
            await deleteDocument(documentId);
            deleteModal.classList.remove("visible");
            // Redirect back to dashboard after short delay so user sees success
            showPageMessage("Document deleted. Redirecting to dashboard...", "success");
            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 1500);
        } catch (error) {
            deleteModal.classList.remove("visible");
            showPageMessage(
                error.message || "Failed to delete the document. Please try again.",
                "error"
            );
        } finally {
            setButtonLoading(confirmDeleteBtn, false);
        }
    });

    // ─────────────────────────────────────────────────────────────
    // INITIAL DATA LOAD
    // ─────────────────────────────────────────────────────────────

    // Mutable reference kept in outer scope so edit save can update it
    let currentDoc = null;

    try {
        const result = await getDocumentById(documentId);
        currentDoc = result.data;

        // Render info card
        renderDocument(currentDoc);

        // Wire file buttons once (avoid duplicate listeners on re-render)
        wireFileButtons();

        // Load subjects list (for the edit form select)
        await loadSubjectsIntoSelect(currentDoc.subjectId || null);

        // Pre-fill edit form
        populateEditForm(currentDoc);

        // Show the content, hide loader
        detailLoader.style.display  = "none";
        detailContent.style.display = "flex";

    } catch (error) {
        showFatalError(error.message || "Failed to load document. Please go back and try again.");
    }

});