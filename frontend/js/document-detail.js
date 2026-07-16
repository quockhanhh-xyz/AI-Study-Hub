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
                refUrl.pathname.includes("folders.html") ||
                refUrl.pathname.includes("community.html")
            )) {
                window.location.href = document.referrer;
                return;
            }
        } catch (e) {
            // Ignore parse errors, fallback to default redirect
        }
    }
    
    if (currentIsCommunityView) {
        window.location.href = "community.html";
    } else {
        window.location.href = "dashboard.html";
    }
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
let currentIsAuthenticated = false;
let currentDocCanProcess = false;
let currentDocCanReprocess = false;
let aiExtractedTextLoaded = false;
let aiExtractedTextExpanded = true;

// Step 10 — AI Q&A chat state
let aiQaChatLoaded = false;
let aiQaSending = false;
let aiQaProcessingStatus = "PENDING";
let aiQaUsageInfo = null;

// Step 14 — AI Tools (Quiz / Flashcard) tab state
let aiToolsLoaded = false;
let aiToolsProcessingStatus = "PENDING";

function normalizeProcessingStatusResponse(res) {
    return res?.success && res?.data ? res.data : (res || {});
}

function setViewerAiProcessingStatus(status) {
    const nextStatus = status || "PENDING";
    aiQaProcessingStatus = nextStatus;
    aiToolsProcessingStatus = nextStatus;
    updateAskAvailability();
    updateAiToolsAvailability();

    const processingStatusBadge = document.getElementById("processingStatusBadge");
    if (processingStatusBadge) {
        processingStatusBadge.textContent = nextStatus === "COMPLETED" ? "AI READY" : nextStatus;
        processingStatusBadge.className = "status-badge " + nextStatus.toLowerCase();
    }

    const toolsPane = document.getElementById("inspectorPaneTools");
    if (nextStatus === "COMPLETED" && toolsPane?.classList.contains("active")) {
        loadAiToolsData();
    }
}

async function refreshViewerProcessingStatusIfMissing(doc) {
    if (!currentIsAuthenticated || !currentDocumentId || doc.processingStatus) return;

    const docId = currentDocumentId;
    try {
        const res = await getProcessingStatus(docId);
        if (docId !== currentDocumentId) return;
        const data = normalizeProcessingStatusResponse(res);
        setViewerAiProcessingStatus(data.processingStatus || "PENDING");
    } catch (err) {
        console.error("Failed to fetch document processing status", err);
        if (docId === currentDocumentId) {
            setViewerAiProcessingStatus("PENDING");
        }
    }
}

// Step 13: detects backend quota errors (e.g. share limit) so we can route
// them through the shared showQuotaError() helper.
function isQuotaError(error) {
    return !!(error && typeof error.code === "string" && /LIMIT_EXCEEDED|QUOTA_EXCEEDED/.test(error.code));
}

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
    currentIsAuthenticated = isAuthenticated;

    currentIsCommunityView =
        !isAuthenticated ||
        params.get("from") === "community" ||
        params.get("mode") === "public";

    initInspectorTabs();

    if (currentIsCommunityView) {
        const backBtn = document.getElementById("detailBackBtn");
        if (backBtn) {
            backBtn.innerHTML = `← Back to Community Library`;
        }
    }

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

    const processingStatusBadge = document.getElementById("processingStatusBadge");
    if (processingStatusBadge) {
        const pStatus = doc.processingStatus || "PENDING";
        processingStatusBadge.textContent = pStatus === "COMPLETED" ? "AI READY" : pStatus;
        processingStatusBadge.style.display = "inline-flex";
        processingStatusBadge.className = "status-badge " + pStatus.toLowerCase();
    }

    // ── Favorite star button (Step: Favorite/Saved Documents) ──
    const favoriteBtn = document.getElementById("favoriteDetailBtn");
    if (favoriteBtn) {
        favoriteBtn.style.display = "inline-flex";
        if (currentIsAuthenticated) {
            const favorited = isDocumentFavorited(doc);
            favoriteBtn.classList.toggle("favorited", favorited);
            favoriteBtn.title = favorited ? "Remove from favorites" : "Add to favorites";
            favoriteBtn.onclick = () => handleToggleFavoriteDetail(doc);
        } else {
            favoriteBtn.title = "Login to add to favorites";
            favoriteBtn.onclick = () => {
                showToast("Please log in to save this document to your favorites.", "warning");
                setTimeout(() => {
                    window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
                }, 1500);
            };
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
    const showDetailsTab = !currentIsCommunityView && doc.canEdit;
    const showSharingTab = !currentIsCommunityView && doc.canShare;
    // AI Q&A tab: available to any logged-in user (owner, shared user, group
    // member, or logged-in public viewer). Backend is the final authority —
    // if the user actually can't ask, askDocumentQuestion() will fail with a
    // mapped error (401/403/409/422) shown inline in the chat panel.
    const hasAiToolsFlag = typeof doc.canUseAiTools === "boolean";
    // For authenticated users, respect the backend flag if present.
    // For guests, always show the tabs to act as a marketing "login prompt" hook.
    const showAiTab = (!currentIsAuthenticated) ? true : (hasAiToolsFlag ? doc.canUseAiTools : true);
    const showToolsTab = (!currentIsAuthenticated) ? true : (hasAiToolsFlag ? doc.canUseAiTools : true);
    const hasInspector = showDetailsTab || showSharingTab || showAiTab || showToolsTab;

    // Update global state for action buttons
    currentDocCanProcess = typeof doc.canProcess === "boolean" ? doc.canProcess : (!currentIsCommunityView && doc.canEdit);
    currentDocCanReprocess = typeof doc.canReprocess === "boolean" ? doc.canReprocess : (!currentIsCommunityView && doc.canEdit);

    // Step 10: reset + (re)populate the AI Q&A tab for this document
    renderAIQaTab(doc);

    // Step 14: reset + (re)populate the AI Tools tab for this document
    renderAiToolsTab(doc);
    refreshViewerProcessingStatusIfMissing(doc);

    if (tabsContainer && tabPanes) {
        if (hasInspector) {
            tabsContainer.style.display = "flex";
            tabPanes.style.display = "block";

            const tabDetails = document.getElementById("inspectorTabDetails");
            const tabSharing = document.getElementById("inspectorTabSharing");
            const tabAI = document.getElementById("inspectorTabAI");
            const tabTools = document.getElementById("inspectorTabTools");

            if (tabDetails) tabDetails.style.display = showDetailsTab ? "block" : "none";
            if (tabSharing) tabSharing.style.display = showSharingTab ? "block" : "none";
            if (tabAI) tabAI.style.display = showAiTab ? "block" : "none";
            if (tabTools) tabTools.style.display = showToolsTab ? "block" : "none";

            // Default active state
            if (showDetailsTab) {
                setActiveTab("details", false);
            } else if (showSharingTab) {
                setActiveTab("sharing", false);
            } else if (showAiTab) {
                setActiveTab("ai", false);
            } else if (showToolsTab) {
                setActiveTab("tools", false);
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

    const canSeePanel = (!currentIsCommunityView && doc.canEdit) || doc.canProcess || doc.canReprocess;
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

    if (currentIsAuthenticated) {
        setViewerAiProcessingStatus(status);
    }
}

function renderAIActions(status) {
    const actionsEl = document.getElementById("aiProcessingActions");
    if (!actionsEl) return;
    actionsEl.innerHTML = "";

    if (status === "PENDING") {
        if (currentDocCanProcess) {
            actionsEl.appendChild(
                buildAIActionButton("Process for AI", "btn-primary", () => handleAIProcessAction("process"))
            );
        }
    } else if (status === "PROCESSING") {
        const loadingBtn = document.createElement("button");
        loadingBtn.type = "button";
        loadingBtn.className = "btn btn-secondary";
        loadingBtn.disabled = true;
        loadingBtn.textContent = "Processing…";
        actionsEl.appendChild(loadingBtn);
    } else if (status === "FAILED") {
        if (currentDocCanProcess) {
            actionsEl.appendChild(
                buildAIActionButton("Retry", "btn-primary", () => handleAIProcessAction("process"))
            );
        }
    } else if (status === "EMPTY_CONTENT") {
        if (currentDocCanReprocess) {
            actionsEl.appendChild(
                buildAIActionButton("Reprocess", "btn-primary", () => handleAIProcessAction("reprocess"))
            );
        }
    } else if (status === "COMPLETED") {
        if (currentDocCanReprocess) {
            actionsEl.appendChild(
                buildAIActionButton("Reprocess", "btn-secondary", () => handleAIProcessAction("reprocess"))
            );
        }
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



// Removed Extracted text logic


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

async function handleToggleFavoriteDetail(doc) {
    const btn = document.getElementById("favoriteDetailBtn");
    if (!btn) return;
    btn.disabled = true;
    const wasFavorited = isDocumentFavorited(doc);
    const id = doc.documentId || doc.id || currentDocumentId;

    try {
        if (wasFavorited) {
            await unfavoriteDocument(id);
            setDocumentFavorited(doc, false);
            btn.classList.remove("favorited");
            btn.title = "Add to favorites";
            window.showToast("Removed from favorites.", "success");
        } else {
            await favoriteDocument(id);
            setDocumentFavorited(doc, true);
            btn.classList.add("favorited");
            btn.title = "Remove from favorites";
            window.showToast("Added to favorites.", "success");
        }
    } catch (err) {
        if (err && err.status === 403) {
            window.showToast("You do not have access to this document.", "error");
        } else {
            window.showToast(err.message || "Failed to update favorite.", "error");
        }
    } finally {
        btn.disabled = false;
    }
}

async function handlePublish() {
    const publishBtn = document.getElementById("publishBtn");
    publishBtn.disabled = true;
    const btnText = publishBtn.querySelector(".btn-text");
    const oldText = btnText ? btnText.textContent : publishBtn.textContent;
    if (btnText) btnText.textContent = "Publishing...";
    else publishBtn.textContent = "Publishing...";

    try {
        const res = await publishDocument(currentDocumentId);
        renderDocument(res.data);
        window.showToast("Document published successfully.", "success");
    } catch (err) {
        window.showToast(err.message || "Failed to publish document.", "error");
    } finally {
        publishBtn.disabled = false;
        if (btnText) btnText.textContent = oldText;
        else publishBtn.textContent = oldText;
    }
}

async function handleUnpublish() {
    const unpublishBtn = document.getElementById("unpublishBtn");
    unpublishBtn.disabled = true;
    const btnText = unpublishBtn.querySelector(".btn-text");
    const oldText = btnText ? btnText.textContent : unpublishBtn.textContent;
    if (btnText) btnText.textContent = "Unpublishing...";
    else unpublishBtn.textContent = "Unpublishing...";

    try {
        const res = await unpublishDocument(currentDocumentId);
        renderDocument(res.data);
        window.showToast("Document unpublished successfully.", "success");
    } catch (err) {
        window.showToast(err.message || "Failed to unpublish document.", "error");
    } finally {
        unpublishBtn.disabled = false;
        if (btnText) btnText.textContent = oldText;
        else unpublishBtn.textContent = oldText;
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
    const tabAI = document.getElementById("inspectorTabAI");
    const tabTools = document.getElementById("inspectorTabTools");
    const paneDetails = document.getElementById("inspectorPaneDetails");
    const paneSharing = document.getElementById("inspectorPaneSharing");
    const paneAI = document.getElementById("inspectorPaneAI");
    const paneTools = document.getElementById("inspectorPaneTools");

    if (!tabDetails || !tabSharing || !tabAI || !tabTools || !paneDetails || !paneSharing || !paneAI || !paneTools) return;

    const tabs = [tabDetails, tabSharing, tabAI, tabTools];
    const panes = [paneDetails, paneSharing, paneAI, paneTools];

    tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
    });

    panes.forEach(p => {
        p.classList.remove("active");
        p.style.display = ""; // Clear any inline styles that override classes
    });

    let activeTab = tabDetails;
    let activePane = paneDetails;
    if (tabId === "sharing") {
        activeTab = tabSharing;
        activePane = paneSharing;
    } else if (tabId === "ai") {
        activeTab = tabAI;
        activePane = paneAI;
    } else if (tabId === "tools") {
        activeTab = tabTools;
        activePane = paneTools;
    }

    activeTab.classList.add("active");
    activeTab.setAttribute("aria-selected", "true");
    activePane.classList.add("active");

    // Lazily load chat history the first time the AI Q&A tab is opened
    if (tabId === "ai") {
        loadAiQaChatHistory();
    }

    // Lazily load Summary/Quiz/Flashcard data the first time AI Tools tab is opened
    if (tabId === "tools") {
        loadAiToolsData();
    }

    if (focus) {
        activeTab.focus();
    }
}

function initInspectorTabs() {
    const tabDetails = document.getElementById("inspectorTabDetails");
    const tabSharing = document.getElementById("inspectorTabSharing");
    const tabAI = document.getElementById("inspectorTabAI");
    const tabTools = document.getElementById("inspectorTabTools");
    const paneDetails = document.getElementById("inspectorPaneDetails");
    const paneSharing = document.getElementById("inspectorPaneSharing");
    const paneAI = document.getElementById("inspectorPaneAI");
    const paneTools = document.getElementById("inspectorPaneTools");

    if (!tabDetails || !tabSharing || !tabAI || !tabTools || !paneDetails || !paneSharing || !paneAI || !paneTools) return;

    // Accessibility attributes
    tabDetails.setAttribute("role", "tab");
    tabDetails.setAttribute("aria-selected", "true");
    tabDetails.setAttribute("aria-controls", "inspectorPaneDetails");
    tabSharing.setAttribute("role", "tab");
    tabSharing.setAttribute("aria-selected", "false");
    tabSharing.setAttribute("aria-controls", "inspectorPaneSharing");
    tabAI.setAttribute("role", "tab");
    tabAI.setAttribute("aria-selected", "false");
    tabAI.setAttribute("aria-controls", "inspectorPaneAI");
    tabTools.setAttribute("role", "tab");
    tabTools.setAttribute("aria-selected", "false");
    tabTools.setAttribute("aria-controls", "inspectorPaneTools");

    paneDetails.setAttribute("role", "tabpanel");
    paneSharing.setAttribute("role", "tabpanel");
    paneAI.setAttribute("role", "tabpanel");
    paneTools.setAttribute("role", "tabpanel");

    const tabs = [tabDetails, tabSharing, tabAI, tabTools];

    tabDetails.addEventListener("click", () => setActiveTab("details", true));
    tabSharing.addEventListener("click", () => setActiveTab("sharing", true));
    tabAI.addEventListener("click", () => setActiveTab("ai", true));
    tabTools.addEventListener("click", () => setActiveTab("tools", true));

    // Keyboard support: Left/Right arrows (skipping hidden tabs)
    const getVisibleTabs = () => {
        const list = [];
        if (tabDetails.offsetWidth > 0 || tabDetails.offsetHeight > 0) {
            list.push({ id: "details", element: tabDetails });
        }
        if (tabSharing.offsetWidth > 0 || tabSharing.offsetHeight > 0) {
            list.push({ id: "sharing", element: tabSharing });
        }
        if (tabAI.offsetWidth > 0 || tabAI.offsetHeight > 0) {
            list.push({ id: "ai", element: tabAI });
        }
        if (tabTools.offsetWidth > 0 || tabTools.offsetHeight > 0) {
            list.push({ id: "tools", element: tabTools });
        }
        return list;
    };

    tabs.forEach((tab) => {
        tab.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const visible = getVisibleTabs();
                if (visible.length <= 1) return;

                e.preventDefault();
                const currentIndex = visible.findIndex(item => item.element === tab);
                if (currentIndex === -1) return;

                const step = e.key === "ArrowRight" ? 1 : -1;
                const nextIndex = (currentIndex + step + visible.length) % visible.length;
                setActiveTab(visible[nextIndex].id, true);
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

    // Helper to open modal and pre-select a tab
    async function openShareModal(tabType = 'user') {
        shareUserEmail.value = "";
        document.getElementById("shareUserError").style.display = "none";
        document.getElementById("shareGroupError").style.display = "none";
        shareModal.classList.add("show");

        if (tabType === 'user') {
            tabUserBtn.click();
        } else {
            tabGroupBtn.click();
        }

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
    }

    // Modal display
    shareBtn.addEventListener("click", async () => {
        await openShareModal('user');
    });

    // Empty state link triggers
    const emptyShareUserLink = document.getElementById("emptyShareUserLink");
    const emptyShareGroupLink = document.getElementById("emptyShareGroupLink");

    if (emptyShareUserLink) {
        emptyShareUserLink.addEventListener("click", () => {
            openShareModal('user');
        });
    }

    if (emptyShareGroupLink) {
        emptyShareGroupLink.addEventListener("click", () => {
            openShareModal('group');
        });
    }

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
            if (isQuotaError(err) && typeof window.showQuotaError === "function") {
                window.showQuotaError(err);
                errorEl.textContent = window.getQuotaErrorMessage ? window.getQuotaErrorMessage(err) : err.message;
            } else {
                errorEl.textContent = err.message || "Failed to share document.";
            }
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
            if (isQuotaError(err) && typeof window.showQuotaError === "function") {
                window.showQuotaError(err);
                errorEl.textContent = window.getQuotaErrorMessage ? window.getQuotaErrorMessage(err) : err.message;
            } else {
                errorEl.textContent = err.message || "Failed to share to group.";
            }
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
            noDirect.style.display = "flex";
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

                main.append(name);
                row.appendChild(main);

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-revoke";
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
            noGroup.style.display = "flex";
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

                main.append(name);
                row.appendChild(main);

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-revoke";
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

// ══════════════════════════════════════════════════════════════════════════
// AI Q&A CHAT PANEL (Step 10)
// APIs used (js/ai-api.js): askDocumentQuestion(id, q), getDocumentChats(id),
// deleteAiChat(chatId), getMyAiUsage()
// UI helpers used (js/ui.js -> AIUIHelper): mapAiError(status),
// normalizeAiUsage(res), getAiModelLabel(modelName), formatAiSourceLabel(chunk, i)
// ══════════════════════════════════════════════════════════════════════════

// Resets and (re)initializes the AI Q&A tab whenever a document is (re)rendered.
function renderAIQaTab(doc) {

    aiQaChatLoaded = false;
    aiQaSending = false;
    aiQaUsageInfo = null;
    aiQaProcessingStatus = doc.processingStatus || "PENDING";

    const messagesEl = document.getElementById("aiQaMessages");
    if (messagesEl) {
        messagesEl.innerHTML =
            '<div class="ai-qa-empty-state" id="aiQaEmptyState">Ask a question about this document to get started.</div>';
    }
    showAiQaBanner("");

    const usageRow = document.getElementById("aiQaUsageRow");
    if (usageRow) usageRow.style.display = "flex";
    const sampleRow = document.getElementById("aiQaSampleQuestions");
    if (sampleRow) sampleRow.style.display = "flex";
    const modelLabel = document.getElementById("aiQaModelLabel");
    if (modelLabel) modelLabel.style.display = "none";

    const textarea = document.getElementById("aiQaQuestionInput");
    if (textarea) textarea.value = "";

    updateAskAvailability();
    if (currentIsAuthenticated) {
        loadAiQaUsage();
    }
}

async function loadAiQaUsage() {
    try {
        const res = await getMyAiUsage();
        aiQaUsageInfo = window.normalizeAiUsage(res);
        renderAiQaUsage();
    } catch (err) {
        // 503 = AI service not configured, 401 = not logged in, etc.
        // Don't block the chat UI itself — just hide the usage row.
        const usageRow = document.getElementById("aiQaUsageRow");
        if (usageRow) usageRow.style.display = "none";
    }
}

function renderAiQaUsage() {
    if (!aiQaUsageInfo) return;
    const usageText = document.getElementById("aiQaUsageText");
    const modelLabel = document.getElementById("aiQaModelLabel");

    if (usageText) {
        usageText.textContent =
            `${aiQaUsageInfo.remainingQuestions}/${aiQaUsageInfo.dailyLimit} questions left today (${aiQaUsageInfo.tier})`;
    }
    if (modelLabel) {
        modelLabel.textContent = window.getAiModelLabel(aiQaUsageInfo.modelName);
        modelLabel.style.display = "inline-flex";
    }

    updateAskAvailability();
}

// Loads chat history once per tab activation (per document).
async function loadAiQaChatHistory() {
    if (!currentIsAuthenticated) return;
    if (aiQaChatLoaded || !currentDocumentId) return;
    aiQaChatLoaded = true;

    try {
        const res = await getDocumentChats(currentDocumentId);
        const raw = res && res.data !== undefined ? res.data : res;

        let messages = [];
        if (Array.isArray(raw)) {
            messages = raw;
        } else if (raw && Array.isArray(raw.messages)) {
            messages = raw.messages;
        } else if (raw && Array.isArray(raw.sessions)) {
            raw.sessions.forEach(s => {
                if (Array.isArray(s.messages)) messages = messages.concat(s.messages);
            });
        }

        if (messages.length === 0) return;

        const messagesEl = document.getElementById("aiQaMessages");
        if (messagesEl) messagesEl.innerHTML = "";

        messages.forEach(m => {
            if (m.question) {
                appendAiQaMessage("user", m.question);
            }
            if (m.answer) {
                appendAiQaMessage("assistant", m.answer, {
                    sourceChunks: m.sourceChunks,
                    modelName: m.modelName
                });
            }
            
            // Fallback for role/content format
            if (!m.question && !m.answer && m.role) {
                const role = (m.role || "").toUpperCase() === "USER" ? "user" : "assistant";
                appendAiQaMessage(role, m.content || "", {
                    sourceChunks: m.sourceChunks,
                    modelName: m.modelName
                });
            }
        });
    } catch (err) {
        console.error("Failed to load AI chat history", err);
        // Silent failure — an empty chat panel is an acceptable fallback.
    }
}

// Appends one chat bubble (user / assistant / loading) to the messages list.
// Uses textContent everywhere (never innerHTML with dynamic content) to avoid XSS.
function appendAiQaMessage(role, content, meta = {}) {
    const messagesEl = document.getElementById("aiQaMessages");
    if (!messagesEl) return null;

    const emptyState = document.getElementById("aiQaEmptyState");
    if (emptyState) emptyState.remove();

    const bubble = document.createElement("div");
    bubble.className = `ai-qa-message ${role}`;
    bubble.textContent = content;

    if (Array.isArray(meta.sourceChunks) && meta.sourceChunks.length > 0) {
        const sourcesEl = document.createElement("div");
        sourcesEl.className = "ai-qa-message-sources";
        const labels = meta.sourceChunks.map((c, i) => window.formatAiSourceLabel(c, i));
        sourcesEl.textContent = "Sources: " + labels.join(", ");
        bubble.appendChild(sourcesEl);
    }

    if (role === "assistant" && meta.modelName) {
        const metaEl = document.createElement("div");
        metaEl.className = "ai-qa-message-meta";
        metaEl.textContent = window.getAiModelLabel(meta.modelName);
        bubble.appendChild(metaEl);
    }

    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
}

function showAiQaBanner(message, type = "info") {
    const banner = document.getElementById("aiQaStatusBanner");
    if (!banner) return;
    if (!message) {
        banner.style.display = "none";
        banner.textContent = "";
        return;
    }
    banner.textContent = message;
    banner.className = `ai-qa-status-banner ${type}`;
    banner.style.display = "block";
}

// Step 10 — messages shown inside the AI Q&A tab itself, distinct from
// AI_STATUS_DESCRIPTIONS (which is written for the owner-only Processing
// panel). These are worded for any viewer, including non-owners who
// cannot see/trigger processing at all.
// Central gate for the Ask button / textarea / sample questions.
const AI_QA_STATUS_MESSAGES = {
    PENDING: "This document has not been processed for AI yet.",
    PROCESSING: "This document is being processed for AI. Please wait…",
    FAILED: "AI processing failed for this document.",
    UNSUPPORTED: "This file type is not supported for AI Q&A.",
    EMPTY_CONTENT: "No readable text was found in this document."
};

// Central gate for the Ask button / textarea / sample questions.
// Disables asking when: not logged in, document not COMPLETED, out of quota,
// or a request is currently in flight.
function updateAskAvailability() {
    const textarea = document.getElementById("aiQaQuestionInput");
    const askBtn = document.getElementById("aiQaAskBtn");
    const sampleButtons = document.querySelectorAll(".ai-qa-sample-btn");
    if (!textarea || !askBtn) return;

    let disabledReason = "";
    if (aiQaProcessingStatus !== "COMPLETED") {
        disabledReason =
            AI_QA_STATUS_MESSAGES[aiQaProcessingStatus] ||
            "This document is not ready for AI yet. Please process it first.";
    } else if (aiQaUsageInfo && aiQaUsageInfo.remainingQuestions <= 0) {
        disabledReason = "You have reached your daily AI question limit.";
    }

    const disabled = !!disabledReason || aiQaSending;
    textarea.disabled = disabled;
    askBtn.disabled = disabled;
    sampleButtons.forEach(b => (b.disabled = disabled));

    if (!aiQaSending) {
        showAiQaBanner(disabledReason, "warning");
    }
}

async function handleAiQaSubmit(e) {
    if (e) e.preventDefault();
    const textarea = document.getElementById("aiQaQuestionInput");
    const askBtn = document.getElementById("aiQaAskBtn");
    
    if (!textarea || textarea.disabled || (askBtn && askBtn.disabled)) return;

    const question = textarea.value.trim();
    if (!question) {
        showAiQaBanner("Please enter a question.", "warning");
        return;
    }
    if (question.length > 2000) {
        showAiQaBanner("Your question is too long.", "warning");
        return;
    }

    await sendAiQaQuestion(question);
}

async function sendAiQaQuestion(question) {
    if (!currentIsAuthenticated) {
        showToast("Please log in to use AI Q&A.", "warning");
        setTimeout(() => {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        }, 1500);
        return;
    }
    aiQaSending = true;
    updateAskAvailability();
    showAiQaBanner("");

    appendAiQaMessage("user", question);

    const textarea = document.getElementById("aiQaQuestionInput");
    if (textarea) textarea.value = "";

    const loadingBubble = appendAiQaMessage("loading", "Thinking…");
    if (loadingBubble) loadingBubble.classList.add("loading");

    try {
        const res = await askDocumentQuestion(currentDocumentId, question);
        const data = res.data || {};

        if (loadingBubble) loadingBubble.remove();
        appendAiQaMessage("assistant", data.answer || "", {
            sourceChunks: data.sourceChunks,
            modelName: data.modelName
        });

        if (typeof data.remainingQuestions === "number" && aiQaUsageInfo) {
            aiQaUsageInfo.remainingQuestions = data.remainingQuestions;
            renderAiQaUsage();
        }
    } catch (err) {
        if (loadingBubble) loadingBubble.remove();
        // Pass the entire error object instead of just the status code to allow advanced mapping of explicit error codes
        const message = window.mapAiError(err);
        showAiQaBanner(message, "error");
    } finally {
        aiQaSending = false;
        updateAskAvailability();
    }
}

function initAiQaHandlers() {
    const form = document.getElementById("aiQaInputForm");
    if (form) form.addEventListener("submit", handleAiQaSubmit);

    const sampleRow = document.getElementById("aiQaSampleQuestions");
    if (sampleRow) {
        sampleRow.addEventListener("click", (e) => {
            const btn = e.target.closest(".ai-qa-sample-btn");
            if (!btn || btn.disabled) return;
            sendAiQaQuestion(btn.dataset.question);
        });
    }

    const textarea = document.getElementById("aiQaQuestionInput");
    if (textarea) {
        // Enter to send, Shift+Enter for newline
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAiQaSubmit();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", initAiQaHandlers);

// ══════════════════════════════════════════════════════════════════════════
// AI TOOLS TAB — Summary / Quiz / Flashcard (Step 14)
// Uses js/ai-learning-api.js helpers. Reuses the same processingStatus
// gating established in Step 9 (doc.processingStatus === "COMPLETED").
// ══════════════════════════════════════════════════════════════════════════

const AI_TOOLS_NOT_READY_MESSAGES = {
    PENDING: "This document has not been processed for AI yet.",
    PROCESSING: "This document is being processed. Please wait…",
    FAILED: "AI processing failed for this document.",
    UNSUPPORTED: "This file type is not supported for AI tools.",
    EMPTY_CONTENT: "No readable text was found in this document."
};

// Resets the tab state and gates generate buttons based on processingStatus.
// Called every time renderDocument() runs (initial load, after Save/Move/Publish).
function renderAiToolsTab(doc) {
    aiToolsLoaded = false; // force reload of summary/quiz/flashcard data for the (possibly new) document
    aiToolsProcessingStatus = doc.processingStatus || "PENDING";


    updateAiToolsAvailability();
}

function updateAiToolsAvailability() {
    const notReadyMsg = document.getElementById("aiToolsNotReadyMessage");
    const content = document.getElementById("aiToolsContent");
    const ready = aiToolsProcessingStatus === "COMPLETED";

    if (notReadyMsg) {
        if (ready) {
            notReadyMsg.style.display = "none";
            notReadyMsg.textContent = "";
        } else {
            notReadyMsg.style.display = "block";
            notReadyMsg.textContent =
                AI_TOOLS_NOT_READY_MESSAGES[aiToolsProcessingStatus] ||
                "This document is not ready for AI tools yet.";
        }
    }
    if (content) content.style.display = ready ? "block" : "none";

    ["flashcardGenerateBtn", "quizGenerateBtn"].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !ready;
    });
}

// Lazily loads Summary + Flashcard sets + Quiz sets the first time the tab opens.
async function loadAiToolsData() {
    if (!currentIsAuthenticated) return;
    if (aiToolsLoaded || !currentDocumentId) return;
    if (aiToolsProcessingStatus !== "COMPLETED") return;
    aiToolsLoaded = true;

    await Promise.all([
        loadFlashcardSets(),
        loadQuizSets()
    ]);
}

// ── Flashcards ───────────────────────────────────────────────────────────
async function loadFlashcardSets() {
    const loader = document.getElementById("flashcardSetsLoader");
    const empty = document.getElementById("flashcardSetsEmpty");
    const list = document.getElementById("flashcardSetsList");

    if (loader) loader.style.display = "block";
    if (empty) empty.style.display = "none";
    if (list) list.innerHTML = "";

    try {
        const res = await AiLearningAPI.getFlashcardSets(currentDocumentId);
        if (loader) loader.style.display = "none";
        renderSetList(list, empty, res.data || [], "flashcards.html?setId=", set =>
            `${set.title || "Flashcard set"} — ${set.itemCount || 0} cards`
        );
    } catch (err) {
        if (loader) loader.style.display = "none";
        console.error("Failed to load flashcard sets", err);
        if (empty) {
            empty.textContent = mapAiLearningError(err);
            empty.style.display = "block";
        }
    }
}

async function handleGenerateFlashcardSet() {
    if (!currentIsAuthenticated) {
        showToast("Please log in to generate Flashcards.", "warning");
        setTimeout(() => {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        }, 1500);
        return;
    }
    const btn = document.getElementById("flashcardGenerateBtn");
    const errorEl = document.getElementById("flashcardError");
    const countInput = document.getElementById("flashcardCountInput");
    if (!btn || btn.disabled) return;

    if (errorEl) errorEl.style.display = "none";
    setButtonLoading(btn, true, "Generating...");

    try {
        const rawCount = countInput ? countInput.value.trim() : "";
        const count = rawCount ? parseInt(rawCount, 10) : undefined;
        await AiLearningAPI.generateFlashcardSet(currentDocumentId, Number.isNaN(count) ? undefined : count);
        showToast("Flashcard set generated successfully", "success");
        await loadFlashcardSets();
    } catch (err) {
        console.error("Failed to generate flashcard set", err);
        if (isQuotaError(err) || err.code === "FLASHCARD_QUOTA_EXCEEDED") {
            showQuotaError(err);
        } else if (errorEl) {
            let errorMsg = mapAiLearningError(err);
            const code = err.code || err.data?.code || "";
            if (code === "AI_PROVIDER_ERROR" || code === "AI_OUTPUT_INVALID" || code === "AI_PROVIDER_TIMEOUT") {
                errorMsg += " Tip: Try choosing fewer cards (e.g. 3 or 5) for better stability.";
            }
            errorEl.textContent = errorMsg;
            errorEl.style.display = "block";
        }
    } finally {
        setButtonLoading(btn, false);
    }
}

// ── Quiz ─────────────────────────────────────────────────────────────────
async function loadQuizSets() {
    const loader = document.getElementById("quizSetsLoader");
    const empty = document.getElementById("quizSetsEmpty");
    const list = document.getElementById("quizSetsList");

    if (loader) loader.style.display = "block";
    if (empty) empty.style.display = "none";
    if (list) list.innerHTML = "";

    try {
        const res = await AiLearningAPI.getQuizSets(currentDocumentId);
        if (loader) loader.style.display = "none";
        renderSetList(list, empty, res.data || [], "quiz.html?setId=", set =>
            `${set.title || "Quiz"} — ${set.questionCount || 0} questions`
        );
    } catch (err) {
        if (loader) loader.style.display = "none";
        console.error("Failed to load quiz sets", err);
        if (empty) {
            empty.textContent = mapAiLearningError(err);
            empty.style.display = "block";
        }
    }
}

async function handleGenerateQuizSet() {
    if (!currentIsAuthenticated) {
        showToast("Please log in to generate Quiz.", "warning");
        setTimeout(() => {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        }, 1500);
        return;
    }
    const btn = document.getElementById("quizGenerateBtn");
    const errorEl = document.getElementById("quizError");
    const countInput = document.getElementById("quizCountInput");
    const difficultySelect = document.getElementById("quizDifficultySelect");
    if (!btn || btn.disabled) return;

    if (errorEl) errorEl.style.display = "none";
    setButtonLoading(btn, true, "Generating...");

    try {
        const rawCount = countInput ? countInput.value.trim() : "";
        const count = rawCount ? parseInt(rawCount, 10) : undefined;
        const difficulty = difficultySelect ? difficultySelect.value : "MIXED";
        await AiLearningAPI.generateQuizSet(currentDocumentId, Number.isNaN(count) ? undefined : count, difficulty);
        showToast("Quiz generated successfully", "success");
        await loadQuizSets();
    } catch (err) {
        console.error("Failed to generate quiz set", err);
        if (isQuotaError(err) || err.code === "QUIZ_QUOTA_EXCEEDED") {
            showQuotaError(err);
        } else if (errorEl) {
            let errorMsg = mapAiLearningError(err);
            const code = err.code || err.data?.code || "";
            if (code === "AI_PROVIDER_ERROR" || code === "AI_OUTPUT_INVALID" || code === "AI_PROVIDER_TIMEOUT") {
                errorMsg += " Tip: Try choosing fewer questions (e.g. 3 or 5) for better stability.";
            }
            errorEl.textContent = errorMsg;
            errorEl.style.display = "block";
        }
    } finally {
        setButtonLoading(btn, false);
    }
}

// Shared renderer for the flashcard-set / quiz-set list items.
// XSS-safe: uses textContent, never innerHTML, for backend-provided strings.
function renderSetList(listEl, emptyEl, sets, detailUrlPrefix, labelFn) {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!sets || sets.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    sets.forEach(set => {
        const li = document.createElement("li");
        li.className = "ai-tools-set-item";

        const link = document.createElement("a");
        const setId = set.flashcardSetId || set.quizSetId;
        link.href = `${detailUrlPrefix}${setId}`;
        link.className = "ai-tools-set-link";

        const titleSpan = document.createElement("span");
        titleSpan.className = "ai-tools-set-title";
        titleSpan.textContent = labelFn(set);

        const meta = document.createElement("span");
        meta.className = "ai-tools-set-meta";
        meta.textContent = formatGeneratedAt(set.createdAt);

        link.appendChild(titleSpan);
        link.appendChild(meta);
        li.appendChild(link);
        listEl.appendChild(li);
    });
}

function initAiToolsHandlers() {
    const flashcardBtn = document.getElementById("flashcardGenerateBtn");
    const quizBtn = document.getElementById("quizGenerateBtn");

    if (flashcardBtn) flashcardBtn.addEventListener("click", handleGenerateFlashcardSet);
    if (quizBtn) quizBtn.addEventListener("click", handleGenerateQuizSet);
}

document.addEventListener("DOMContentLoaded", initAiToolsHandlers);
