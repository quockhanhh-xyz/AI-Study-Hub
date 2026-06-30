// document-detail.js – FE2: Document Detail & Edit Page
// Standardized UI styles and theme configurations.

function handleBack() {
    if (document.referrer) {
        try {
            const refUrl = new URL(document.referrer);
            if (refUrl.origin === window.location.origin && (
                refUrl.pathname.includes("dashboard.html") ||
                refUrl.pathname.includes("documents.html") ||
                refUrl.pathname.includes("shared-with-me.html") ||
                refUrl.pathname.includes("group-detail.html") ||
                refUrl.pathname.includes("shared-folder-detail.html") ||
                refUrl.pathname.includes("folders.html")
            )) {
                window.location.href = document.referrer;
                return;
            }
        } catch (e) {
            // Ignore parse errors, fallback to default redirect
        }
    }
    window.location.href = "dashboard.html";
}

// Fix #3: showFatalError queries DOM directly to avoid ReferenceError
// when detailLoader variable is not yet declared
function showFatalError(message, showLoginButton = false) {
    const loader = document.getElementById("detailLoader");
    if (loader) {
        loader.innerHTML = ""; // Clear loader text content safely

        const errorDiv = document.createElement("div");
        errorDiv.className = "error-state";
        errorDiv.style.marginTop = "48px";

        const iconDiv = document.createElement("div");
        iconDiv.className = "error-state-icon";
        iconDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2c5.5228 0 10 4.47715 10 10 0 5.5228 -4.4772 10 -10 10 -5.52285 0 -10 -4.4772 -10 -10C2 6.47715 6.47715 2 12 2m0 2c-4.41828 0 -8 3.58172 -8 8 0 4.4183 3.58172 8 8 8 4.4183 0 8 -3.5817 8 -8 0 -4.41828 -3.5817 -8 -8 -8M9.5 17h-2v-2h2zm3.5 0h-2v-2h2zm3.5 0h-2v-2h2zm-7 -4h-2V7h2zm3.5 0h-2V7h2zm3.5 0h-2V7h2z" stroke-width="1"></path></svg>';

        const titleDiv = document.createElement("div");
        titleDiv.className = "error-state-title";
        titleDiv.textContent = "Access Error";

        const descDiv = document.createElement("div");
        descDiv.className = "error-state-desc";
        descDiv.textContent = message; // Safe textContent assignment

        errorDiv.append(iconDiv, titleDiv, descDiv);

        if (showLoginButton) {
            const loginBtn = document.createElement("button");
            loginBtn.className = "btn btn-primary";
            loginBtn.style.marginTop = "16px";
            loginBtn.style.width = "auto";
            loginBtn.textContent = "Login";
            loginBtn.onclick = () => {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            };
            errorDiv.appendChild(loginBtn);
        }

        loader.appendChild(errorDiv);
    }
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const detailLoader = document.getElementById("detailLoader");
const detailContent = document.getElementById("detailContent");

// ── State ─────────────────────────────────────────────────────────────────────
let currentDocumentId = null;
let currentDocumentFolderId = null;
let currentIsCommunityView = false;
let aiExtractedTextLoaded = false;
let aiExtractedTextExpanded = true;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const isAuthenticated = window.authReady
        ? await window.authReady
        : false;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        showFatalError("No document ID provided. Please open this page from your Dashboard.");
        return;
    }

    currentDocumentId = id;

    currentIsCommunityView =
        !isAuthenticated ||
        params.get("from") === "community" ||
        params.get("mode") === "public";

    initInspectorTabs();

    loadPage(id, {
        isAuthenticated,
        isCommunityView: currentIsCommunityView
    });

    if (isAuthenticated) {
        initSharingUI();
    }
});

// ── Load document detail + subjects in parallel ────────────────────────────
async function loadPage(id, { isAuthenticated, isCommunityView }) {
    try {
        let docRes;
        let subjectsRes = null;

        if (isCommunityView) {
            docRes = await getPublicDocumentById(id);
        } else {
            const results = await Promise.all([
                getDocumentById(id),
                getSubjects()
            ]);

            docRes = results[0];
            subjectsRes = results[1];
        }

        renderDocument(docRes.data);

        if (!isCommunityView && subjectsRes) {
            renderSubjectOptions(
                subjectsRes.data,
                docRes.data.subjectId
            );
        }

        detailLoader.style.display = "none";
        detailContent.hidden = false;
    } catch (err) {
        if (!isAuthenticated) {
            showFatalError("This document is private or no longer available.", true);
        } else {
            if (err.status === 403) {
                showFatalError("Access Denied (403): You do not have permission to view this document.");
            } else if (err.status === 404) {
                showFatalError("Document Not Found (404): The requested document does not exist, has been deleted, or has been revoked.");
            } else {
                showFatalError(err.message || "Failed to load document.");
            }
        }
    }
}

// ── Render document info ──────────────────────────────────────────────────────
function renderDocument(doc) {
    document.getElementById("fileTypeBadge").textContent = (doc.fileType || "–").toUpperCase();
    document.getElementById("docTitle").textContent = doc.title || "–";

    // Hide email in community view to prevent exposure
    const docUploadedBy = document.getElementById("docUploadedBy");
    if (docUploadedBy) {
        if (currentIsCommunityView) {
            if (doc.ownerName) {
                docUploadedBy.style.display = "inline";
                docUploadedBy.textContent = "Uploaded by " + doc.ownerName;
            } else {
                docUploadedBy.style.display = "none";
            }
        } else {
            docUploadedBy.style.display = "inline";
            docUploadedBy.textContent = "Uploaded by " + (doc.uploadedByName || doc.ownerName || "–");
        }
    }

    document.getElementById("docDescription").textContent = doc.description || "No description provided.";
    document.getElementById("docSubject").textContent = doc.subject
        ? doc.subject
        : (doc.subjectCode ? `${doc.subjectCode} – ${doc.subjectName}` : "No subject");
    document.getElementById("docFileSize").textContent = formatFileSize(doc.fileSize);
    document.getElementById("docCreatedAt").textContent = formatDate(doc.createdAt);

    // Render visibility and approval badges
    const visibilityBadge = document.getElementById("visibilityBadge");
    const approvalBadge = document.getElementById("approvalBadge");

    if (visibilityBadge) {
        if (doc.visibility) {
            visibilityBadge.textContent = doc.visibility;
            visibilityBadge.style.display = "inline-flex";
            visibilityBadge.className = "status-badge " + doc.visibility.toLowerCase();
        } else {
            visibilityBadge.style.display = "none";
        }
    }

    if (approvalBadge) {
        if (doc.visibility === "PUBLIC" && doc.approvalStatus) {
            approvalBadge.textContent = doc.approvalStatus;
            approvalBadge.style.display = "inline-flex";
            approvalBadge.className = "status-badge " + doc.approvalStatus.toLowerCase();
        } else {
            approvalBadge.style.display = "none";
        }
    }

    // Pre-fill edit form
    const editTitle = document.getElementById("editTitle");
    const editDesc = document.getElementById("editDescription");
    if (editTitle) editTitle.value = doc.title || "";
    if (editDesc) editDesc.value = doc.description || "";

    // ── Action buttons based on permission flags from backend ──
    const openBtn = document.getElementById("openFileBtn");
    const downloadBtn = document.getElementById("downloadFileBtn");
    const shareBtn = document.getElementById("shareBtn");
    const moveBtn = document.getElementById("moveBtn");
    const publishBtn = document.getElementById("publishBtn");
    const unpublishBtn = document.getElementById("unpublishBtn");
    const documentActionRow = document.getElementById("documentActionRow");

    currentDocumentFolderId = doc.folderId;
    // ── AI Processing panel (Step 9) — owner only ──
    renderAIProcessingPanel(doc);

    // Open button
    if (openBtn) {
        if (doc.canOpen && doc.fileUrl) {
            openBtn.style.display = "inline-flex";
            openBtn.onclick = () => openDocument(doc);
        } else {
            openBtn.style.display = "none";
        }
    }

    // Download button
    if (downloadBtn) {
        if (doc.canDownload) {
            downloadBtn.style.display = "inline-flex";

            if (currentIsCommunityView) {
                downloadBtn.onclick = () =>
                    downloadPublicDocument(doc.documentId || doc.id);
            } else {
                downloadBtn.onclick = () =>
                    downloadDocument(doc);
            }
        } else {
            downloadBtn.style.display = "none";
        }
    }

    // Move button
    if (moveBtn) {
        if (!currentIsCommunityView && doc.canMove) {
            moveBtn.style.display = "inline-flex";
        } else {
            moveBtn.style.display = "none";
        }
    }

    // Share button — only the owner has canShare
    const sharesPanel = document.getElementById("sharesPanel");
    if (shareBtn) {
        if (!currentIsCommunityView && doc.canShare) {
            shareBtn.style.display = "inline-flex";
            if (sharesPanel) sharesPanel.style.display = "block";
            loadSharingInfo(doc.documentId || doc.id);
        } else {
            shareBtn.style.display = "none";
            if (sharesPanel) sharesPanel.style.display = "none";
        }
    }

    // Edit section — only the owner has canEdit
    const editSec = document.querySelector(".edit-section");
    if (editSec) {
        editSec.style.display =
            !currentIsCommunityView && doc.canEdit ? "block" : "none";
    }

    // Delete button — only the owner has canDelete
    const dangerZone = document.querySelector(".inspector-danger-zone");
    if (dangerZone) {
        dangerZone.style.display =
            !currentIsCommunityView && doc.canDelete ? "block" : "none";
    }

    // Publish button
    if (publishBtn) {
        if (doc.canPublish) {
            publishBtn.style.display = "inline-flex";
            publishBtn.onclick = () => handlePublish();
        } else {
            publishBtn.style.display = "none";
        }
    }

    // Unpublish button
    if (unpublishBtn) {
        if (doc.canUnpublish) {
            unpublishBtn.style.display = "inline-flex";
            unpublishBtn.onclick = () => handleUnpublish();
        } else {
            unpublishBtn.style.display = "none";
        }
    }

    if (documentActionRow) {
        const hasDocumentActions = !currentIsCommunityView && (
            doc.canShare || doc.canMove || doc.canPublish || doc.canUnpublish
        );
        documentActionRow.style.display = hasDocumentActions ? "flex" : "none";
    }

    // ── Call render preview (document-preview.js) ──
    if (typeof renderDocumentPreview === "function") {
        renderDocumentPreview(doc);
    }

    // Configure Inspector panel visibility and defaults
    const tabsContainer = document.querySelector(".inspector-tabs-container");
    const tabPanes = document.querySelector(".inspector-panes");
    const hasInspector = doc.canEdit || doc.canShare;

    if (tabsContainer && tabPanes) {
        if (!currentIsCommunityView && hasInspector) {
            tabsContainer.style.display = "flex";
            tabPanes.style.display = "block";

            const tabDetails = document.getElementById("inspectorTabDetails");
            const tabSharing = document.getElementById("inspectorTabSharing");

            if (tabDetails) tabDetails.style.display = doc.canEdit ? "block" : "none";
            if (tabSharing) tabSharing.style.display = doc.canShare ? "block" : "none";

            // Default active state
            if (doc.canEdit) {
                setActiveTab("details", false);
            } else if (doc.canShare) {
                setActiveTab("sharing", false);
            }
        } else {
            tabsContainer.style.display = "none";
            tabPanes.style.display = "none";
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// AI PROCESSING PANEL (Step 9)
// Uses the polling API provided by PR #117 (js/processing-api.js):
//   processDocument(id), reprocessDocument(id), getProcessingStatus(id),
//   getDocumentContent(id), startDocumentPolling(id, onStatusUpdate, onTerminalState),
//   stopDocumentPolling(id), DOCUMENT_PROCESSING_STATUS
// ══════════════════════════════════════════════════════════════════════════

const AI_STATUS_DESCRIPTIONS = {
    PENDING: "This document has not been processed for AI yet. Process it to prepare it for AI Q&A.",
    PROCESSING: "Processing this document… this may take a moment.",
    COMPLETED: "This document has been processed successfully and is ready for AI Q&A.",
    FAILED: "Processing failed. You can retry to process this document again.",
    UNSUPPORTED: "This file format is not supported for AI processing yet.",
    EMPTY_CONTENT: "No readable text content was found in this file."
};

function renderAIProcessingPanel(doc) {
    const section = document.getElementById("aiProcessingSection");
    if (!section) return;

    const canSeePanel = !currentIsCommunityView && doc.canEdit;
    if (!canSeePanel) {
        section.style.display = "none";
        if (currentDocumentId) stopDocumentPolling(currentDocumentId);
        return;
    }

    section.style.display = "block";
    aiExtractedTextLoaded = false;
    aiExtractedTextExpanded = true;
    const textBox = document.getElementById("aiExtractedTextBox");
    if (textBox) textBox.style.display = "none";

    // The Document Detail DTO only contains `processingStatus`, so render
    // immediately with that, then enrich the panel with the full
    // processing-status payload (characterCount, wordCount, lastAttemptError,
    // lastAttemptStatus...), which the detail DTO does not include. This is
    // also what makes documents that are already COMPLETED from a previous
    // session show their metadata correctly on first load.
    const status = doc.processingStatus || "PENDING";
    applyAIProcessingState(status, { processingStatus: status });

    fetchAndApplyProcessingStatus();
}

// Fetches the full processing-status payload once and applies it to the panel.
// Called on every panel render (initial load, after Save/Move/Publish), and
// also kicks off polling automatically if the fetched status is PROCESSING.
async function fetchAndApplyProcessingStatus() {
    const docId = currentDocumentId;
    try {
        const res = await getProcessingStatus(docId);
        if (docId !== currentDocumentId) return; // navigated away / doc switched meanwhile
        const data = res.data || {};
        applyAIProcessingState(data.processingStatus, data);

        if (data.processingStatus === "PROCESSING") {
            startAIPolling();
        }
    } catch (err) {
        // Keep showing whatever was already rendered from the detail DTO;
        // a transient status-fetch failure shouldn't break the whole panel.
        console.error("Failed to fetch processing status", err);
    }
}

function applyAIProcessingState(status, data) {
    data = data || {};
    status = status || "PENDING";
    const meta = DOCUMENT_PROCESSING_STATUS[status] || { label: status };

    const badge = document.getElementById("aiStatusBadge");
    if (badge) {
        badge.className = "status-badge " + status.toLowerCase().replace(/_/g, "-");
        badge.innerHTML = "";
        if (status === "PROCESSING") {
            const spinner = document.createElement("span");
            spinner.className = "ai-status-spinner";
            badge.appendChild(spinner);
        }
        badge.appendChild(document.createTextNode(meta.label));
    }

    const metaEl = document.getElementById("aiProcessingMeta");
    if (metaEl) {
        if (status === "COMPLETED" && (data.characterCount || data.wordCount)) {
            let text = `${data.wordCount || 0} words · ${data.characterCount || 0} characters`;
            if (data.isTruncated) text += " · truncated";
            metaEl.textContent = text;
        } else {
            metaEl.textContent = "";
        }
    }

    const messageEl = document.getElementById("aiProcessingMessage");
    if (messageEl) {
        let text = AI_STATUS_DESCRIPTIONS[status] || "";
        if (status === "FAILED" && data.lastAttemptError) {
            text = data.lastAttemptError;
        }
        messageEl.textContent = text;
        messageEl.className = "ai-processing-message" + (status === "FAILED" ? " error" : "");
    }

    // Reprocess-failure-but-content-preserved case: per the Step 9 spec,
    // when reprocessing a COMPLETED document fails, the backend restores
    // processingStatus = COMPLETED and keeps the old content/chunks, but
    // records the failure in lastAttemptStatus/lastAttemptError. The panel
    // must surface that instead of silently looking like nothing happened.
    const warningEl = document.getElementById("aiProcessingWarning");
    if (warningEl) {
        if (status === "COMPLETED" && data.lastAttemptStatus === "FAILED") {
            warningEl.style.display = "block";
            warningEl.textContent = data.lastAttemptError
                ? `Last reprocess attempt failed: ${data.lastAttemptError}. Showing the previous successful version.`
                : "Last reprocess attempt failed. Showing the previous successful version.";
        } else {
            warningEl.style.display = "none";
            warningEl.textContent = "";
        }
    }

    renderAIActions(status);
}

function renderAIActions(status) {
    const actionsEl = document.getElementById("aiProcessingActions");
    if (!actionsEl) return;
    actionsEl.innerHTML = "";

    if (status === "PENDING") {
        actionsEl.appendChild(
            buildAIActionButton("Process for AI", "btn-primary", () => handleAIProcessAction("process"))
        );
    } else if (status === "PROCESSING") {
        const loadingBtn = document.createElement("button");
        loadingBtn.type = "button";
        loadingBtn.className = "btn btn-secondary";
        loadingBtn.disabled = true;
        loadingBtn.textContent = "Processing…";
        actionsEl.appendChild(loadingBtn);
    } else if (status === "FAILED") {
        actionsEl.appendChild(
            buildAIActionButton("Retry", "btn-primary", () => handleAIProcessAction("process"))
        );
    } else if (status === "EMPTY_CONTENT") {
        actionsEl.appendChild(
            buildAIActionButton("Reprocess", "btn-primary", () => handleAIProcessAction("reprocess"))
        );
    } else if (status === "COMPLETED") {
        actionsEl.appendChild(
            buildAIActionButton("View Extracted Text", "btn-secondary", handleViewExtractedText)
        );
        actionsEl.appendChild(
            buildAIActionButton("Reprocess", "btn-secondary", () => handleAIProcessAction("reprocess"))
        );
    }
}

function buildAIActionButton(label, btnClass, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn " + btnClass;
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
}

async function handleAIProcessAction(action) {
    const actionsEl = document.getElementById("aiProcessingActions");
    if (actionsEl) {
        Array.from(actionsEl.querySelectorAll("button")).forEach(b => (b.disabled = true));
    }

    try {
        const res = action === "reprocess"
            ? await reprocessDocument(currentDocumentId)
            : await processDocument(currentDocumentId);

        const status = (res.data && res.data.processingStatus) || "PROCESSING";
        applyAIProcessingState(status, res.data || {});
        startAIPolling();
    } catch (err) {
        if (err.status === 409) {
            // Already PROCESSING (e.g. duplicate click). startDocumentPolling()
            // itself no-ops if a session already exists for this document, so
            // this safely resumes the same session instead of a new timer.
            applyAIProcessingState("PROCESSING", {});
            startAIPolling();
            window.showToast("Document is already being processed.", "info");
        } else {
            window.showToast(err.message || "Failed to start AI processing.", "error");
            fetchAndApplyProcessingStatus();
        }
    }
}

// Wraps PR #117's startDocumentPolling(documentId, onStatusUpdate, onTerminalState).
function startAIPolling() {
    startDocumentPolling(
        currentDocumentId,
        (status, data) => applyAIProcessingState(status, data),
        (status, data) => {
            if (status === "TIMEOUT") {
                const messageEl = document.getElementById("aiProcessingMessage");
                if (messageEl) {
                    messageEl.textContent = "Processing is taking longer than expected. It will keep running in the background — you can check back later.";
                }
                return;
            }
            if (status === "ERROR") {
                window.showToast((data && data.message) || "Failed to check processing status.", "error");
                return;
            }
            applyAIProcessingState(status, data);
        }
    );
}

async function handleViewExtractedText() {
    const box = document.getElementById("aiExtractedTextBox");
    const contentEl = document.getElementById("aiExtractedTextContent");
    if (!box || !contentEl) return;

    if (aiExtractedTextLoaded) {
        aiExtractedTextExpanded = !aiExtractedTextExpanded;
        box.style.display = aiExtractedTextExpanded ? "block" : "none";
        return;
    }

    contentEl.textContent = "Loading extracted text…";
    box.style.display = "block";
    aiExtractedTextExpanded = true;

    try {
        const res = await getDocumentContent(currentDocumentId);
        const text = (res.data && res.data.extractedText) || "";
        contentEl.textContent = text || "(No text available.)";
        aiExtractedTextLoaded = true;
    } catch (err) {
        contentEl.textContent = "";
        box.style.display = "none";
        window.showToast(err.message || "Failed to load extracted text.", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("aiTextToggleBtn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const box = document.getElementById("aiExtractedTextBox");
            aiExtractedTextExpanded = !aiExtractedTextExpanded;
            if (box) box.style.display = aiExtractedTextExpanded ? "block" : "none";
            toggleBtn.textContent = aiExtractedTextExpanded ? "Collapse" : "Expand";
        });
    }
});


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

    if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
        window.UIHelper.convertSelectToCustomDropdown(select);
        select.dispatchEvent(new Event("syncCustom"));
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
        window.showToast("Changes saved successfully.", "success");
    } catch (err) {
        showEditMessage(err.message || "Failed to save changes.", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
    }
}

async function handleDelete() {
    const confirmed = await window.confirmAction({
        title: "Move this document to Trash?",
        message: "You can restore it later from Trash.",
        confirmText: "Delete",
        danger: true
    });
    if (!confirmed) return;

    try {
        await deleteDocument(currentDocumentId);
        window.showToast("Document deleted.", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);
    } catch (err) {
        window.showToast(err.message || "Failed to delete document.", "error");
    }
}

async function handlePublish() {
    const publishBtn = document.getElementById("publishBtn");
    publishBtn.disabled = true;
    const oldText = publishBtn.textContent;
    publishBtn.textContent = "Publishing...";

    try {
        const res = await publishDocument(currentDocumentId);
        renderDocument(res.data);
        window.showToast("Document published successfully.", "success");
    } catch (err) {
        window.showToast(err.message || "Failed to publish document.", "error");
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = oldText;
    }
}

async function handleUnpublish() {
    const unpublishBtn = document.getElementById("unpublishBtn");
    unpublishBtn.disabled = true;
    const oldText = unpublishBtn.textContent;
    unpublishBtn.textContent = "Unpublishing...";

    try {
        const res = await unpublishDocument(currentDocumentId);
        renderDocument(res.data);
        window.showToast("Document unpublished successfully.", "success");
    } catch (err) {
        window.showToast(err.message || "Failed to unpublish document.", "error");
    } finally {
        unpublishBtn.disabled = false;
        unpublishBtn.textContent = oldText;
    }
}

// ── Move modal ────────────────────────────────────────────────────────────────
function showMoveModal() {
    const errorEl = document.getElementById("moveError");
    if (errorEl) errorEl.style.display = "none";
    const select = document.getElementById("moveFolderSelect");
    if (!select) return;

    getMyFolders(null, true).then(res => {
        const folders = Array.isArray(res.data) ? res.data : [];
        select.innerHTML = '<option value="">— My Documents —</option>';
        folders.forEach(f => {
            const path = [];
            let current = f;
            let iterations = 0;
            while (current && iterations < 100) {
                path.unshift(current.folderName);
                const parentId = current.parentFolderId;
                if (!parentId) break;
                current = folders.find(folder => folder.folderId === parentId);
                iterations++;
            }
            const opt = document.createElement("option");
            opt.value = f.folderId;
            opt.textContent = path.join(" / ") || "Untitled Folder";
            if (currentDocumentFolderId === f.folderId) {
                opt.disabled = true;
                opt.textContent += " (Current)";
            }
            select.appendChild(opt);
        });
        if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
            window.UIHelper.convertSelectToCustomDropdown(select);
            select.dispatchEvent(new Event("syncCustom"));
        }
        document.getElementById("moveModal").classList.add("show");
    }).catch(err => {
        window.showToast(err.message || "Failed to load folders.", "error");
    });
}

function hideMoveModal() {
    document.getElementById("moveModal").classList.remove("show");
}

async function handleMove() {
    const select = document.getElementById("moveFolderSelect");
    if (!select) return;
    const folderIdVal = select.value ? parseInt(select.value, 10) : null;
    const confirmBtn = document.getElementById("moveConfirmBtn");
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Moving...";
    }

    try {
        const res = await moveDocument(currentDocumentId, folderIdVal);
        hideMoveModal();
        window.showToast("Document moved successfully.", "success");
        renderDocument(res.data);
    } catch (err) {
        const errEl = document.getElementById("moveError");
        if (errEl) {
            errEl.textContent = err.message || "Failed to move document.";
            errEl.style.display = "block";
        }
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Move";
        }
    }
}

// ── Edit message helper ───────────────────────────────────────────────────────
function showEditMessage(text, type) {
    const el = document.getElementById("editMessage");
    el.textContent = text;
    el.className = "helper-text" + (type === "error" ? " error" : type === "success" ? " success" : "");
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

// ── Inspector Tabs UI ────────────────────────────────────────────────────────
function setActiveTab(tabId, focus = true) {
    const tabDetails = document.getElementById("inspectorTabDetails");
    const tabSharing = document.getElementById("inspectorTabSharing");
    const paneDetails = document.getElementById("inspectorPaneDetails");
    const paneSharing = document.getElementById("inspectorPaneSharing");

    if (!tabDetails || !tabSharing || !paneDetails || !paneSharing) return;

    const tabs = [tabDetails, tabSharing];
    const panes = [paneDetails, paneSharing];

    tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
    });

    panes.forEach(p => {
        p.classList.remove("active");
        p.style.display = ""; // Clear any inline styles that override classes
    });

    const activeTab = tabId === "sharing" ? tabSharing : tabDetails;
    const activePane = tabId === "sharing" ? paneSharing : paneDetails;

    activeTab.classList.add("active");
    activeTab.setAttribute("aria-selected", "true");
    activePane.classList.add("active");

    if (focus) {
        activeTab.focus();
    }
}

function initInspectorTabs() {
    const tabDetails = document.getElementById("inspectorTabDetails");
    const tabSharing = document.getElementById("inspectorTabSharing");
    const paneDetails = document.getElementById("inspectorPaneDetails");
    const paneSharing = document.getElementById("inspectorPaneSharing");

    if (!tabDetails || !tabSharing || !paneDetails || !paneSharing) return;

    // Accessibility attributes
    tabDetails.setAttribute("role", "tab");
    tabDetails.setAttribute("aria-selected", "true");
    tabDetails.setAttribute("aria-controls", "inspectorPaneDetails");
    tabSharing.setAttribute("role", "tab");
    tabSharing.setAttribute("aria-selected", "false");
    tabSharing.setAttribute("aria-controls", "inspectorPaneSharing");

    paneDetails.setAttribute("role", "tabpanel");
    paneSharing.setAttribute("role", "tabpanel");

    const tabs = [tabDetails, tabSharing];

    tabDetails.addEventListener("click", () => setActiveTab("details", true));
    tabSharing.addEventListener("click", () => setActiveTab("sharing", true));

    // Keyboard support: Left/Right arrows
    tabs.forEach((tab, index) => {
        tab.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const nextIndex = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                const nextTabId = nextIndex === 1 ? "sharing" : "details";
                setActiveTab(nextTabId, true);
            }
        });
    });
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
        } finally {
            if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
                window.UIHelper.convertSelectToCustomDropdown(shareGroupSelect);
                shareGroupSelect.dispatchEvent(new Event("syncCustom"));
            }
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
            window.showToast("Document shared successfully.", "success");
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
            window.showToast("Document shared to group successfully.", "success");
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
                name.textContent = item.sharedWithName || "Unknown User";

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
    const confirmed = await window.confirmAction({
        title: "Revoke Direct Share",
        message: "Are you sure you want to revoke this direct share?",
        confirmText: "Revoke",
        danger: true
    });
    if (!confirmed) return;
    try {
        await revokeDocumentShare(shareId);
        window.showToast("Share revoked successfully.", "success");
        loadSharingInfo(currentDocumentId);
    } catch (err) {
        window.showToast(err.message || "Failed to revoke share.", "error");
    }
}

async function handleRevokeGroup(shareId) {
    const confirmed = await window.confirmAction({
        title: "Revoke Group Share",
        message: "Are you sure you want to revoke this group share?",
        confirmText: "Revoke",
        danger: true
    });
    if (!confirmed) return;
    try {
        await revokeGroupDocumentShare(shareId);
        window.showToast("Group share revoked successfully.", "success");
        loadSharingInfo(currentDocumentId);
    } catch (err) {
        window.showToast(err.message || "Failed to revoke group share.", "error");
    }
}
