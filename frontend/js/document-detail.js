// document-detail.js – FE2: Document Detail & Edit Page
// Standardized UI styles and theme configurations.

function handleBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    if (from === 'group') {
        const groupId = urlParams.get('groupId');
        if (groupId) {
            window.location.href = `group-detail.html?id=${groupId}`;
            return;
        }
    }

    if (document.referrer) {
        try {
            const refUrl = new URL(document.referrer);
            if (refUrl.origin === window.location.origin && (
                refUrl.pathname.includes("dashboard.html") ||
                refUrl.pathname.includes("documents.html") ||
                refUrl.pathname.includes("my-library.html") ||
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
        window.location.href = "documents.html";
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
let currentDocumentForTopBar = null;
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
let currentPlanLimits = null; // { maxQuizQuestionsPerSet, maxFlashcardsPerSet } from Plan API

const AI_SUPPORTED_FILE_TYPES = new Set(["PDF", "TXT", "DOCX", "PPTX", "XLSX"]);

function normalizeDocumentFileType(docOrValue) {
    const rawValue = typeof docOrValue === "string"
        ? docOrValue
        : (docOrValue?.fileType || docOrValue?.originalFileName || docOrValue?.fileName || "");
    const raw = String(rawValue || "").trim();
    const extension = raw.includes(".") ? raw.slice(raw.lastIndexOf(".") + 1) : raw;
    return extension.replace(".", "").toUpperCase();
}

function isDocumentAiSupported(doc) {
    if (!doc) return false;
    // Prioritize explicit backend processingStatus if returned (COMPLETED, PROCESSING, PENDING, FAILED)
    const backendStatus = String(doc.processingStatus || "").trim().toUpperCase();
    if (backendStatus && backendStatus !== "UNSUPPORTED") {
        return true;
    }
    return AI_SUPPORTED_FILE_TYPES.has(normalizeDocumentFileType(doc));
}

function getCurrentDocumentContext() {
    return currentDocumentForTopBar || window.currentDocumentDetailForTopBar || null;
}

function getEffectiveAiProcessingStatus(doc, statusOverride) {
    const status = String(statusOverride || doc?.processingStatus || "PENDING").trim().toUpperCase();
    if (status === "UNSUPPORTED" || status === "EMPTY_CONTENT") return status;
    if (doc && !isDocumentAiSupported(doc)) return "UNSUPPORTED";
    return status || "PENDING";
}

function getAiStatusLabel(status) {
    if (status === "COMPLETED") return "AI Ready";
    if (status === "PROCESSING") return "AI Processing";
    if (status === "FAILED") return "AI Failed";
    if (status === "UNSUPPORTED") return "AI: Not supported";
    if (status === "EMPTY_CONTENT") return "AI: Empty content";
    return "AI: " + status.charAt(0) + status.slice(1).toLowerCase();
}

function getAiUnsupportedMessage(doc) {
    const type = normalizeDocumentFileType(doc) || "This file type";
    return `${type} files are not supported for AI Q&A or AI learning tools yet. You can still open or download the file.`;
}

function normalizeProcessingStatusResponse(res) {
    return res?.success && res?.data ? res.data : (res || {});
}

function setViewerAiProcessingStatus(status) {
    const nextStatus = getEffectiveAiProcessingStatus(getCurrentDocumentContext(), status);
    aiQaProcessingStatus = nextStatus;
    aiToolsProcessingStatus = nextStatus;
    updateAskAvailability();
    updateAiToolsAvailability();

    const processingStatusBadge = document.getElementById("processingStatusBadge");
    const aiStatusInlineRow = document.getElementById("aiStatusInlineRow");
    const aiStatusInlineDot = document.getElementById("aiStatusInlineDot");
    if (processingStatusBadge) {
        processingStatusBadge.textContent = getAiStatusLabel(nextStatus);
    }
    if (aiStatusInlineDot) {
        aiStatusInlineDot.className = "ai-status-dot " + nextStatus.toLowerCase();
    }
    if (aiStatusInlineRow) {
        aiStatusInlineRow.style.display = "flex";
    }

    const toolsPane = document.getElementById("inspectorPaneTools");
    if (nextStatus === "COMPLETED" && toolsPane?.classList.contains("active")) {
        loadAiToolsData();
    }
}

async function refreshViewerProcessingStatusIfMissing(doc) {
    if (!isDocumentAiSupported(doc)) {
        setViewerAiProcessingStatus("UNSUPPORTED");
        return;
    }
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
    initEditFormListeners();

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
        loadPlanLimitsForAiTools();
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
    currentDocumentForTopBar = doc;
    window.currentDocumentDetailForTopBar = doc;

    document.getElementById("fileTypeBadge").textContent = (doc.fileType || "–").toUpperCase();
    const docTitleEl = document.getElementById("docTitle");
    if (docTitleEl) {
        docTitleEl.textContent = doc.title || "–";
        docTitleEl.title = doc.title || "";
    }

    renderContextualTopBar(doc);

    // Update Document Reading Header
    const previewHeaderTitle = document.getElementById("previewHeaderTitle");
    const previewHeaderMetaText = document.getElementById("previewHeaderMetaText");
    const previewHeaderAiBadge = document.getElementById("previewHeaderAiBadge");
    
    if (previewHeaderTitle) {
        previewHeaderTitle.textContent = doc.title || "Document Preview";
        previewHeaderTitle.title = doc.title || "Document Preview";
    }
    
    if (previewHeaderMetaText) {
        const subjectCtx = doc.subject ? doc.subject : (doc.subjectName ? `${doc.subjectCode} - ${doc.subjectName}` : "");
        const sizeStr = formatFileSize(doc.fileSize);
        const typeStr = (doc.fileType || "").toUpperCase();
        previewHeaderMetaText.textContent = `${subjectCtx ? subjectCtx + ' \u00B7 ' : ''}${typeStr} \u00B7 ${sizeStr}`;
    }
    
    if (previewHeaderAiBadge) {
        const pStatus = getEffectiveAiProcessingStatus(doc);
        previewHeaderAiBadge.className = `preview-header-badge ai-${pStatus.toLowerCase()}`;
        previewHeaderAiBadge.textContent = getAiStatusLabel(pStatus);
        previewHeaderAiBadge.style.display = "inline-flex";
        
        previewHeaderAiBadge.onclick = () => {
            setActiveTab("ai", true);
        };
    }

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
    const aiStatusInlineRow = document.getElementById("aiStatusInlineRow");
    const aiStatusInlineDot = document.getElementById("aiStatusInlineDot");
    if (processingStatusBadge) {
        const pStatus = getEffectiveAiProcessingStatus(doc);
        processingStatusBadge.textContent = getAiStatusLabel(pStatus);
        if (aiStatusInlineDot) aiStatusInlineDot.className = "ai-status-dot " + pStatus.toLowerCase();
        if (aiStatusInlineRow) aiStatusInlineRow.style.display = "flex";
    }

    const visibilityStatusContent = document.getElementById("visibilityStatusContent");
    const privateVisibilityNote = document.getElementById("privateVisibilityNote");
    const pendingVisibilityNote = document.getElementById("pendingVisibilityNote");
    const rejectedVisibilityNote = document.getElementById("rejectedVisibilityNote");
    const rejectedVisibilityCopy = document.getElementById("rejectedVisibilityCopy");

    if (visibilityStatusContent && privateVisibilityNote) {
        if (doc.visibility === "PUBLIC") {
            if (doc.approvalStatus === "PENDING") {
                if (pendingVisibilityNote) pendingVisibilityNote.style.display = "flex";
                if (rejectedVisibilityNote) rejectedVisibilityNote.style.display = "none";
                visibilityStatusContent.style.display = "none";
                privateVisibilityNote.style.display = "none";
            } else if (doc.approvalStatus === "REJECTED") {
                if (pendingVisibilityNote) pendingVisibilityNote.style.display = "none";
                if (rejectedVisibilityNote) {
                    rejectedVisibilityNote.style.display = "flex";
                    if (rejectedVisibilityCopy) {
                        rejectedVisibilityCopy.textContent = doc.rejectReason
                            ? `Reason: ${doc.rejectReason}`
                            : "This document submission was rejected by the admin. You can edit and resubmit for review.";
                    }
                }
                visibilityStatusContent.style.display = "none";
                privateVisibilityNote.style.display = "none";
            } else {
                if (pendingVisibilityNote) pendingVisibilityNote.style.display = "none";
                if (rejectedVisibilityNote) rejectedVisibilityNote.style.display = "none";
                visibilityStatusContent.style.display = "flex";
                privateVisibilityNote.style.display = "none";
            }
        } else {
            if (pendingVisibilityNote) pendingVisibilityNote.style.display = "none";
            if (rejectedVisibilityNote) rejectedVisibilityNote.style.display = "none";
            visibilityStatusContent.style.display = "none";
            privateVisibilityNote.style.display = "flex";
        }
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

    const viewTitleText = document.getElementById("viewTitleText");
    const viewDescriptionText = document.getElementById("viewDescriptionText");
    const viewSubjectText = document.getElementById("viewSubjectText");
    if (viewTitleText) viewTitleText.textContent = doc.title || "–";
    if (viewDescriptionText) {
        if (doc.description) {
            viewDescriptionText.textContent = doc.description;
            viewDescriptionText.classList.remove("empty");
        } else {
            viewDescriptionText.textContent = "No description added.";
            viewDescriptionText.classList.add("empty");
        }
    }
    if (viewSubjectText) {
        if (doc.subject || doc.subjectCode) {
            viewSubjectText.textContent = doc.subject
                ? doc.subject
                : `${doc.subjectCode} \u2013 ${doc.subjectName}`;
            viewSubjectText.classList.remove("empty");
        } else {
            viewSubjectText.textContent = "No subject";
            viewSubjectText.classList.add("empty");
        }
    }
    
    // Ensure save button is disabled when initially loading
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.disabled = true;

    // ── Action buttons based on permission flags from backend ──
    const openBtn = document.getElementById("openFileBtn");
    const downloadBtn = document.getElementById("downloadFileBtn");
    const shareBtn = document.getElementById("shareBtn");
    const moveBtn = document.getElementById("moveBtn");
    const publishBtn = document.getElementById("sharingPublishBtn");
    const unpublishBtn = document.getElementById("sharingUnpublishBtn");
    const documentActionRow = document.getElementById("documentActionRow");
    const actionRowDesc = document.getElementById("actionRowDesc");

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
                    downloadPublicDocument(doc);
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

    // Toggle Share Action row helper description
    if (actionRowDesc) {
        actionRowDesc.style.display = (!currentIsCommunityView && doc.canShare) ? "block" : "none";
    }

    // Edit section — only the owner has canEdit
    const viewSec = document.getElementById("detailsViewSection");
    if (viewSec) {
        viewSec.style.display =
            !currentIsCommunityView && doc.canEdit ? "block" : "none";
    }

    // Delete button — only the owner has canDelete
    const detailsDangerZone = document.getElementById("detailsDangerZone");
    if (detailsDangerZone) {
        detailsDangerZone.style.display =
            !currentIsCommunityView && doc.canDelete ? "block" : "none";
    }

    // Publish button
    if (publishBtn) {
        const canRequestSystemSubject = Boolean(doc.canRequestSystemSubject || doc.requiresSystemSubjectRequest);
        if (doc.canPublish || canRequestSystemSubject) {
            publishBtn.style.display = "inline-flex";
            const btnTextEl = publishBtn.querySelector(".btn-text");
            const isPersonalSubject = (doc.subject && doc.subject.scope === "USER_CUSTOM")
                || doc.subjectScope === "USER_CUSTOM"
                || canRequestSystemSubject;

            if (isPersonalSubject) {
                const label = "Request System Subject";
                if (btnTextEl) btnTextEl.textContent = label;
                else publishBtn.textContent = label;
                publishBtn.onclick = () => openSubjectRequestModalForDoc(doc);
            } else {
                const label = doc.approvalStatus === "REJECTED" ? "Resubmit for Review" : "Submit for Review";
                if (btnTextEl) btnTextEl.textContent = label;
                else publishBtn.textContent = label;
                publishBtn.onclick = () => handlePublish();
            }
        } else {
            publishBtn.style.display = "none";
        }
    }

    // Unpublish button
    if (unpublishBtn) {
        if (doc.canUnpublish) {
            unpublishBtn.style.display = "inline-flex";
            const btnTextEl = unpublishBtn.querySelector(".btn-text");
            let label = "Unpublish from Community";
            if (doc.approvalStatus === "PENDING") {
                label = "Cancel Review Submission";
            } else if (doc.approvalStatus === "APPROVED") {
                label = "Unpublish from Community";
            } else if (doc.approvalStatus === "REJECTED") {
                label = "Withdraw Submission";
            }
            if (btnTextEl) btnTextEl.textContent = label;
            else unpublishBtn.textContent = label;
            unpublishBtn.onclick = () => handleUnpublish();
        } else {
            unpublishBtn.style.display = "none";
        }
    }

    if (documentActionRow) {
        const hasDocumentActions = !currentIsCommunityView && (
            doc.canShare || doc.canMove
        );
        documentActionRow.style.display = hasDocumentActions ? "flex" : "none";
    }

    // ── Call render preview (document-preview.js) ──
    if (typeof renderDocumentPreview === "function") {
        renderDocumentPreview(doc);
    }

    // ── Initialize Ratings & Reports widget (Step 17A) ──
    if (typeof initRatingReportingWidget === "function") {
        initRatingReportingWidget(doc);
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

            // Default active state — respects ?tab= from the URL (e.g. the
            // "Back to document" link on flashcards.html/quiz.html uses
            // ?tab=tools so the user lands back on AI Tools, not Details).
            const requestedTab = new URLSearchParams(window.location.search).get("tab");
            if (requestedTab === "tools" && showToolsTab) {
                setActiveTab("tools", false);
            } else if (requestedTab === "ai" && showAiTab) {
                setActiveTab("ai", false);
            } else if (requestedTab === "sharing" && showSharingTab) {
                setActiveTab("sharing", false);
            } else if (showDetailsTab) {
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
    initTopBarSearch();
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
    const status = getEffectiveAiProcessingStatus(doc);
    applyAIProcessingState(status, { processingStatus: status });

    if (status === "UNSUPPORTED") return;
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
        const status = getEffectiveAiProcessingStatus(getCurrentDocumentContext(), data.processingStatus);
        applyAIProcessingState(status, { ...data, processingStatus: status });

        if (status === "PROCESSING") {
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
    status = getEffectiveAiProcessingStatus(getCurrentDocumentContext(), status);
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
        if (status === "UNSUPPORTED") {
            text = getAiUnsupportedMessage(getCurrentDocumentContext());
        }
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

        const status = getEffectiveAiProcessingStatus(
            getCurrentDocumentContext(),
            (res.data && res.data.processingStatus) || "PROCESSING"
        );
        applyAIProcessingState(status, { ...(res.data || {}), processingStatus: status });
        if (status === "PROCESSING") startAIPolling();
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
        (status, data) => applyAIProcessingState(getEffectiveAiProcessingStatus(getCurrentDocumentContext(), status), data),
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
            applyAIProcessingState(getEffectiveAiProcessingStatus(getCurrentDocumentContext(), status), data);
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

// ── View/Edit Mode ────────────────────────────────────────────────────────────
window.toggleEditMode = function(isEdit) {
    const viewSec = document.getElementById("detailsViewSection");
    const editSec = document.getElementById("detailsEditSection");
    if (isEdit) {
        if (viewSec) viewSec.style.display = "none";
        if (editSec) editSec.style.display = "block";
        const saveBtn = document.getElementById("saveBtn");
        if (saveBtn) saveBtn.disabled = true;
    } else {
        if (viewSec) viewSec.style.display = "block";
        if (editSec) editSec.style.display = "none";
    }
};

function initEditFormListeners() {
    const titleIn = document.getElementById("editTitle");
    const descIn = document.getElementById("editDescription");
    const subjIn = document.getElementById("editSubject");
    const saveBtn = document.getElementById("saveBtn");
    
    function checkChanges() {
        if (saveBtn) saveBtn.disabled = false;
    }
    
    if (titleIn) titleIn.addEventListener("input", checkChanges);
    if (descIn) descIn.addEventListener("input", checkChanges);
    if (subjIn) subjIn.addEventListener("change", checkChanges);
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
        window.toggleEditMode(false);
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
        message: "It will be removed from My Documents and any folders where it appears.\nYou can restore it from Trash within 30 days.",
        confirmText: "Move to Trash",
        danger: true
    });
    if (!confirmed) return;

    try {
        await deleteDocument(currentDocumentId);
        window.showToast("Document moved to Trash.", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);
    } catch (err) {
        window.showToast(err.message || "Failed to move document to Trash.", "error");
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
    const publishBtn = document.getElementById("sharingPublishBtn");
    publishBtn.disabled = true;
    const btnText = publishBtn.querySelector(".btn-text");
    const oldText = btnText ? btnText.textContent : publishBtn.textContent;
    if (btnText) btnText.textContent = "Submitting...";
    else publishBtn.textContent = "Submitting...";

    try {
        const res = await publishDocument(currentDocumentId);
        renderDocument(res.data);
        const msg = (res && res.message) ? res.message : "Document submitted for admin review.";
        window.showToast(msg, "success");
    } catch (err) {
        if (err.message && (err.message.includes("personal subject") || err.message.includes("USER_CUSTOM"))) {
            window.showToast("This document uses a personal subject. Request a system subject before publishing.", "error");
        } else {
            window.showToast(err.message || "Failed to submit document for review.", "error");
        }
    } finally {
        publishBtn.disabled = false;
        if (btnText) btnText.textContent = oldText;
        else publishBtn.textContent = oldText;
    }
}

function openSubjectRequestModalForDoc(doc) {
    const modal = document.getElementById("subjectReqModal");
    if (!modal) {
        window.showToast("This document uses a personal subject. Please request a system subject before publishing.", "info");
        return;
    }

    const codeInput = document.getElementById("reqSubjectCode");
    const nameInput = document.getElementById("reqSubjectName");
    const descInput = document.getElementById("reqSubjectDesc");
    const msgEl = document.getElementById("reqSubjectMsg");

    if (msgEl) msgEl.style.display = "none";
    if (codeInput && doc) codeInput.value = doc.subjectCode || (doc.subject ? doc.subject.subjectCode : "") || "";
    if (nameInput && doc) nameInput.value = doc.subjectName || (doc.subject ? doc.subject.subjectName : "") || "";
    if (descInput && doc) descInput.value = `Request system subject for document: ${doc.title || doc.documentId}`;

    modal.classList.add("open");

    const cancelBtn = document.getElementById("cancelSubjectReqBtn");
    if (cancelBtn) {
        cancelBtn.onclick = () => modal.classList.remove("open");
    }

    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove("open");
    };

    const submitBtn = document.getElementById("submitSubjectReqBtn");
    if (submitBtn) {
        submitBtn.onclick = async () => {
            const subjectCode = codeInput ? codeInput.value.trim() : "";
            const subjectName = nameInput ? nameInput.value.trim() : "";
            const description = descInput ? descInput.value.trim() : "";

            if (!subjectCode || !subjectName) {
                if (msgEl) {
                    msgEl.textContent = "Subject Code and Name are required.";
                    msgEl.style.display = "block";
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Submitting...";

            try {
                if (typeof createSubjectRequest === "function") {
                    await createSubjectRequest({ subjectCode, subjectName, description });
                }
                modal.classList.remove("open");
                window.showToast("System subject request submitted for admin review.", "success");
            } catch (err) {
                if (msgEl) {
                    msgEl.textContent = err.message || "Failed to submit request.";
                    msgEl.style.display = "block";
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Request";
            }
        };
    }
}

async function handleUnpublish() {
    const unpublishBtn = document.getElementById("sharingUnpublishBtn");
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
    let dateStr = String(isoString);
    if (!dateStr.endsWith("Z") && !dateStr.includes("+")) {
        dateStr += "Z";
    }
    const d = new Date(dateStr);
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

    // Empty state link triggers & Header buttons
    const emptyShareUserLink = document.getElementById("emptyShareUserLink");
    const emptyShareGroupLink = document.getElementById("emptyShareGroupLink");
    const addShareUserLink = document.getElementById("addShareUserLink");
    const addShareGroupLink = document.getElementById("addShareGroupLink");

    if (emptyShareUserLink) {
        emptyShareUserLink.addEventListener("click", () => {
            openShareModal('user');
        });
    }
    if (addShareUserLink) {
        addShareUserLink.addEventListener("click", () => {
            openShareModal('user');
        });
    }

    if (emptyShareGroupLink) {
        emptyShareGroupLink.addEventListener("click", () => {
            openShareModal('group');
        });
    }
    if (addShareGroupLink) {
        addShareGroupLink.addEventListener("click", () => {
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
        const addShareUserLink = document.getElementById("addShareUserLink");
        directList.innerHTML = "";
        if (userShares.length === 0) {
            noDirect.style.display = "flex";
            if (addShareUserLink) addShareUserLink.style.display = "none";
        } else {
            noDirect.style.display = "none";
            if (addShareUserLink) addShareUserLink.style.display = "inline-flex";
            userShares.forEach(item => {
                const row = document.createElement("div");
                row.className = "member-row";

                const main = document.createElement("div");
                main.className = "member-row-main";

                const name = document.createElement("span");
                name.className = "member-row-name";
                name.textContent = item.sharedWithName || "Unknown User";

                main.append(name);
                
                const perm = document.createElement("div");
                perm.style.fontSize = "11px";
                perm.style.color = "var(--muted)";
                perm.style.marginTop = "2px";
                perm.textContent = "Can open & download";
                main.append(perm);

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
        const addShareGroupLink = document.getElementById("addShareGroupLink");
        groupList.innerHTML = "";
        if (groupShares.length === 0) {
            noGroup.style.display = "flex";
            if (addShareGroupLink) addShareGroupLink.style.display = "none";
        } else {
            noGroup.style.display = "none";
            if (addShareGroupLink) addShareGroupLink.style.display = "inline-flex";
            groupShares.forEach(item => {
                const row = document.createElement("div");
                row.className = "member-row";

                const main = document.createElement("div");
                main.className = "member-row-main";

                const name = document.createElement("span");
                name.className = "member-row-name";
                name.textContent = groupMap[item.groupId] || `Group (ID: ${item.groupId})`;

                main.append(name);

                const perm = document.createElement("div");
                perm.style.fontSize = "11px";
                perm.style.color = "var(--muted)";
                perm.style.marginTop = "2px";
                perm.textContent = "Can open & download";
                main.append(perm);
                
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
    aiQaProcessingStatus = getEffectiveAiProcessingStatus(doc);

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
function appendAiQaMessage(role, content, meta = {}) {
    const messagesEl = document.getElementById("aiQaMessages");
    if (!messagesEl) return null;

    const emptyState = document.getElementById("aiQaEmptyState");
    if (emptyState) emptyState.remove();

    const bubble = document.createElement("div");
    bubble.className = `ai-qa-message ${role}`;

    // Simple markdown-like parser to allow paragraphs and bullets without XSS
    if (role === "assistant" && content) {
        // Escape HTML first
        let html = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Convert basic lists (- item)
        html = html.replace(/(?:^|\n)- (.*?)(?=\n|$)/g, "<ul><li>$1</li></ul>");
        html = html.replace(/<\/ul>\n<ul>/g, ""); // merge adjacent lists

        // Wrap remaining text in paragraphs
        const parts = html.split(/\n\n+/);
        bubble.innerHTML = parts.map(p => {
            if (p.startsWith("<ul>")) return p;
            return `<p>${p.replace(/\n/g, "<br>")}</p>`;
        }).join("");
    } else {
        bubble.textContent = content;
    }

    if (Array.isArray(meta.sourceChunks) && meta.sourceChunks.length > 0) {
        const formatSourceLabel = window.formatAiSourceLabel || ((_, index) => `Chunk ${index + 1}`);
        const seenSourceLabels = new Set();
        const sourceLabels = [];

        meta.sourceChunks.forEach((chunk, index) => {
            const sourceLabel = formatSourceLabel(chunk, index);
            const dedupeKey = String(sourceLabel || "").trim().toLowerCase();

            if (!dedupeKey || seenSourceLabels.has(dedupeKey)) {
                return;
            }

            seenSourceLabels.add(dedupeKey);
            sourceLabels.push(sourceLabel);
        });

        if (sourceLabels.length > 0) {
            const sourcesEl = document.createElement("div");
            sourcesEl.className = "ai-qa-message-sources";

            const label = document.createElement("span");
            label.textContent = "Sources: ";
            sourcesEl.appendChild(label);

            sourceLabels.forEach((sourceLabel) => {
                const chip = document.createElement("span");
                chip.className = "ai-qa-source-chip";
                chip.textContent = sourceLabel;
                sourcesEl.appendChild(chip);
            });

            bubble.appendChild(sourcesEl);
        }
    }

    if (role === "assistant" && meta.modelName) {
        const metaEl = document.createElement("div");
        metaEl.className = "ai-qa-message-meta";
        metaEl.textContent = window.getAiModelLabel(meta.modelName);
        bubble.appendChild(metaEl);
    }

    messagesEl.appendChild(bubble);
    // Scroll the message container down without shifting the main page layout
    setTimeout(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
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
    UNSUPPORTED: "This file type is not supported for AI Q&A or AI learning tools yet.",
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
    const processingSection = document.getElementById("aiProcessingSection");
    const aiQaMessages = document.getElementById("aiQaMessages");
    const sampleRow = document.getElementById("aiQaSampleQuestions");

    const qaStickyFooter = document.querySelector(".ai-qa-sticky-footer");

    if (aiQaProcessingStatus !== "COMPLETED") {
        disabledReason = "Document not ready for AI.";
        if (qaStickyFooter) qaStickyFooter.style.display = "none";
        
        // Handle Onboarding state visibility
        if (processingSection) {
            processingSection.style.display = "flex";
            processingSection.classList.toggle("is-unsupported", aiQaProcessingStatus === "UNSUPPORTED");
            const msgEl = document.getElementById("aiProcessingMessage");
            const headEl = processingSection.querySelector(".ai-processing-heading");
            const iconEl = processingSection.querySelector(".ai-processing-icon");
            const actionsEl = document.getElementById("aiProcessingActions");
            
            if (aiQaProcessingStatus === "PROCESSING") {
                if (iconEl) iconEl.innerHTML = '<div class="ai-processing-spinner"></div>';
                if (headEl) headEl.textContent = "Processing document...";
                if (msgEl) msgEl.textContent = "Please wait while we extract the content.";
                if (actionsEl) actionsEl.innerHTML = "";
            } else if (aiQaProcessingStatus === "PENDING") {
                if (iconEl) iconEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24"><g id="Sparkle"><path id="Vector" fill="currentColor" d="m8.24536 15.7542 1.70215 0.8515 1.78909 0.8945 -1.78909 0.8946 -1.70215 0.8506 -0.85058 1.7021 -0.89454 1.7891 -0.89453 -1.7891 -0.85156 -1.7021 -3.49023 -1.7452 1.78906 -0.8945 1.70117 -0.8515 0.85156 -1.7012 0.89453 -1.7891zM18.2454 9.25415l2.7021 1.35155 1.7891 0.8945 -1.7891 0.8946 -2.7021 1.3506 -1.3506 2.7021 -0.8946 1.7891 -0.8945 -1.7891 -1.3515 -2.7021 -4.49028 -2.2452 1.78908 -0.8945 2.7012 -1.35155 1.3515 -2.70117 0.8945 -1.78906zm-2.8506 1.19335 -0.1494 0.2979 -0.2979 0.1494 -1.2109 0.6054 1.2109 0.6055 0.2979 0.1494 0.1494 0.2979 0.6054 1.2109 0.6055 -1.2109 0.1494 -0.2979 0.2979 -0.1494 1.2109 -0.6055 -1.2109 -0.6054 -0.2979 -0.1494 -0.1494 -0.2979 -0.6055 -1.21093zM8.24536 4.75415l1.70215 0.85156 1.78909 0.89453 -1.78909 0.89454 -1.70215 0.85058 -0.85058 1.70215 -0.89454 1.78909 -0.89453 -1.78909 -0.85156 -1.70215 -3.49023 -1.74512 1.78906 -0.89453 1.70117 -0.85156 0.85156 -1.70117 0.89453 -1.78906z" stroke-width="1"></path></g></svg>`;
                if (headEl) headEl.textContent = "Prepare this document for AI Q&A";
                if (msgEl) msgEl.textContent = "We’ll extract the content so AI can answer questions from this document.";
                if (actionsEl) {
                    actionsEl.innerHTML = `<button class="btn btn-primary" onclick="handleAIProcessAction('process')">Process for AI</button>`;
                }
            } else {
                if (iconEl) iconEl.textContent = "!";
                if (headEl) {
                    headEl.textContent = aiQaProcessingStatus === "UNSUPPORTED"
                        ? "AI is not available for this file type"
                        : "Cannot process document";
                }
                if (msgEl) {
                    msgEl.textContent = aiQaProcessingStatus === "UNSUPPORTED"
                        ? getAiUnsupportedMessage(getCurrentDocumentContext())
                        : (AI_QA_STATUS_MESSAGES[aiQaProcessingStatus] || "Failed to process.");
                }
                if (actionsEl) actionsEl.innerHTML = "";
            }
        }
        if (aiQaMessages) aiQaMessages.style.display = "none";
        if (sampleRow) sampleRow.style.display = "none";
    } else {
        if (qaStickyFooter) qaStickyFooter.style.display = "flex";
        if (processingSection) {
            processingSection.style.display = "none";
            processingSection.classList.remove("is-unsupported");
        }
        if (aiQaMessages) aiQaMessages.style.display = "flex";
        if (sampleRow) sampleRow.style.display = "flex";
        
        if (aiQaUsageInfo && aiQaUsageInfo.remainingQuestions <= 0) {
            disabledReason = "You have reached your daily AI question limit.";
        }
    }

    const disabled = !!disabledReason || aiQaSending;
    textarea.disabled = disabled;
    askBtn.disabled = disabled;
    sampleButtons.forEach(b => (b.disabled = disabled));

    if (!aiQaSending) {
        // Only show banner if there's a reason AND it's not just "not ready" (which is handled by onboarding)
        if (disabledReason && aiQaProcessingStatus === "COMPLETED") {
            showAiQaBanner(disabledReason, "warning");
        } else {
            showAiQaBanner("");
        }
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
// AI TOOLS TAB — Quiz / Flashcard (Step 14)
// Uses js/ai-learning-api.js helpers. Reuses the same processingStatus
// gating established in Step 9 (doc.processingStatus === "COMPLETED").
// ══════════════════════════════════════════════════════════════════════════

const AI_TOOLS_NOT_READY_MESSAGES = {
    PENDING: "This document has not been processed for AI yet.",
    PROCESSING: "This document is being processed. Please wait…",
    FAILED: "AI processing failed for this document.",
    UNSUPPORTED: "This file type is not supported for AI Q&A or AI learning tools yet.",
    EMPTY_CONTENT: "No readable text was found in this document."
};

// Loads the current user's plan limits (maxQuizQuestionsPerSet /
// maxFlashcardsPerSet) once, so the Generate forms can show a hint and clamp
// the count instead of using hardcoded values. Best-effort: if the plan
// endpoint isn't available/named differently, we silently skip the hint —
// the backend still enforces the real limit on generate.
async function loadPlanLimitsForAiTools() {
    try {
        const res = await getAccountEntitlements();
        const limits = res?.data?.limits || null;
        // Confirmed via /api/account/entitlements response: the backend
        // exposes a single combined "maxItemsPerSet" for BOTH quiz questions
        // and flashcards, NOT separate maxQuizQuestionsPerSet /
        // maxFlashcardsPerSet as the original plan doc described. Mapping
        // both to the same value here; flagged to the team separately.
        currentPlanLimits = limits
            ? {
                maxQuizQuestionsPerSet: limits.maxQuizQuestionsPerSet ?? limits.maxItemsPerSet,
                maxFlashcardsPerSet: limits.maxFlashcardsPerSet ?? limits.maxItemsPerSet
            }
            : null;
    } catch (err) {
        console.warn("Could not load plan limits for AI Tools generate form (non-fatal):", err);
        currentPlanLimits = null;
    }
    applyAiToolsLimitsToForm();
}

// Applies currentPlanLimits to the flashcard/quiz count inputs: sets the
// HTML max attribute and shows a hint. Never hardcodes 20/50/80 — if limits
// aren't loaded, the inputs just have no upper hint (backend still validates).
function applyAiToolsLimitsToForm() {
    const flashcardInput = document.getElementById("flashcardCountInput");
    const flashcardHint = document.getElementById("flashcardCountHint");
    const quizInput = document.getElementById("quizCountInput");
    const quizHint = document.getElementById("quizCountHint");

    const maxFlashcards = currentPlanLimits?.maxFlashcardsPerSet;
    const maxQuiz = currentPlanLimits?.maxQuizQuestionsPerSet;

    if (flashcardInput) {
        if (maxFlashcards) {
            flashcardInput.max = maxFlashcards;
            if (flashcardHint) flashcardHint.textContent = `Up to ${maxFlashcards} cards on your plan`;
        } else if (flashcardHint) {
            flashcardHint.textContent = "";
        }
    }

    if (quizInput) {
        if (maxQuiz) {
            quizInput.max = maxQuiz;
            if (quizHint) quizHint.textContent = `Up to ${maxQuiz} questions on your plan`;
        } else if (quizHint) {
            quizHint.textContent = "";
        }
    }
}

// Updates the "X/300" character counter under a focus textarea.
function updateFocusCharCount(inputId, countId) {
    const input = document.getElementById(inputId);
    const countEl = document.getElementById(countId);
    if (!input || !countEl) return;
    countEl.textContent = `${input.value.length}/300`;
}

function setupFocusToggle(buttonId, panelId) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);
    if (!button || !panel) return;

    button.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        const nextExpanded = !expanded;
        button.setAttribute("aria-expanded", String(nextExpanded));
        panel.classList.toggle("open", nextExpanded);
        button.textContent = nextExpanded ? "- Hide focus topic" : "+ Add focus topic";
    });
}

// Resets the tab state and gates generate buttons based on processingStatus.
// Called every time renderDocument() runs (initial load, after Save/Move/Publish).
function renderAiToolsTab(doc) {
    aiToolsLoaded = false; // force reload of summary/quiz/flashcard data for the (possibly new) document
    aiToolsProcessingStatus = getEffectiveAiProcessingStatus(doc);


    updateAiToolsAvailability();
}

function updateAiToolsAvailability() {
    const notReadyMsg = document.getElementById("aiToolsNotReadySection");
    const content = document.getElementById("aiToolsContent");
    const ready = aiToolsProcessingStatus === "COMPLETED";

    if (notReadyMsg) {
        if (ready) {
            notReadyMsg.style.display = "none";
            notReadyMsg.classList.remove("is-unsupported");
        } else {
            notReadyMsg.style.display = "flex";
            notReadyMsg.classList.toggle("is-unsupported", aiToolsProcessingStatus === "UNSUPPORTED");
            const msgEl = document.getElementById("aiToolsProcessingMessage");
            const headEl = notReadyMsg.querySelector(".ai-processing-heading");
            const iconEl = notReadyMsg.querySelector(".ai-processing-icon");
            if (msgEl) {
                msgEl.textContent =
                    aiToolsProcessingStatus === "UNSUPPORTED"
                    ? getAiUnsupportedMessage(getCurrentDocumentContext())
                    : (AI_TOOLS_NOT_READY_MESSAGES[aiToolsProcessingStatus] ||
                    "This document is not ready for AI tools yet.");
            }
            if (headEl) {
                headEl.textContent = aiToolsProcessingStatus === "UNSUPPORTED"
                    ? "AI tools are not available for this file type"
                    : "Prepare this document";
            }
            if (iconEl) {
                iconEl.textContent = aiToolsProcessingStatus === "UNSUPPORTED" ? "!" : "✦";
            }
            
            // Build actions similar to AI Q&A
            const actionsEl = document.getElementById("aiToolsProcessingActions");
            if (actionsEl) {
                actionsEl.innerHTML = "";
                if (aiToolsProcessingStatus === "PROCESSING") {
                    actionsEl.innerHTML = `<span class="ai-processing-spinner"></span> <span style="font-size:13px; color:var(--text);">Processing document...</span>`;
                } else if (aiToolsProcessingStatus === "PENDING" && currentDocCanProcess) {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "btn btn-primary";
                    btn.textContent = "Process for AI";
                    btn.onclick = () => {
                        handleAIProcessAction("process");
                    };
                    actionsEl.appendChild(btn);
                } else if (aiToolsProcessingStatus === "FAILED" && currentDocCanProcess) {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "btn btn-primary";
                    btn.textContent = "Retry Processing";
                    btn.onclick = () => {
                        handleAIProcessAction("process");
                    };
                    actionsEl.appendChild(btn);
                } else if (aiToolsProcessingStatus === "EMPTY_CONTENT" && currentDocCanReprocess) {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "btn btn-primary";
                    btn.textContent = "Reprocess";
                    btn.onclick = () => {
                        handleAIProcessAction("reprocess");
                    };
                    actionsEl.appendChild(btn);
                }
            }
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
        renderSetList(list, empty, res.data || [], "flashcards.html?setId=", "flashcard");
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
    const focusInput = document.getElementById("flashcardFocusInput");
    if (!btn || btn.disabled) return;

    if (errorEl) errorEl.style.display = "none";

    const focusRaw = focusInput ? focusInput.value.trim() : "";
    if (focusRaw.length > 300) {
        if (errorEl) {
            errorEl.textContent = "Focus must be 300 characters or fewer.";
            errorEl.style.display = "block";
        }
        return;
    }

    setButtonLoading(btn, true, "Generating...");

    try {
        const rawCount = countInput ? countInput.value.trim() : "";
        let count = rawCount ? parseInt(rawCount, 10) : undefined;
        if (count !== undefined && !Number.isNaN(count) && currentPlanLimits?.maxFlashcardsPerSet) {
            count = Math.min(count, currentPlanLimits.maxFlashcardsPerSet);
        }

        await AiLearningAPI.generateFlashcardSet(
            currentDocumentId,
            Number.isNaN(count) ? undefined : count,
            focusRaw || undefined
        );
        showToast("Flashcard set generated successfully", "success");
        if (focusInput) focusInput.value = "";
        updateFocusCharCount("flashcardFocusInput", "flashcardFocusCount");
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
            } else if (code === "INVALID_GENERATION_FOCUS") {
                errorMsg = "Focus text is invalid or too long. Please shorten it.";
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
        renderSetList(list, empty, res.data || [], "quiz.html?setId=", "quiz");
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
    const focusInput = document.getElementById("quizFocusInput");
    if (!btn || btn.disabled) return;

    if (errorEl) errorEl.style.display = "none";

    const focusRaw = focusInput ? focusInput.value.trim() : "";
    if (focusRaw.length > 300) {
        if (errorEl) {
            errorEl.textContent = "Focus must be 300 characters or fewer.";
            errorEl.style.display = "block";
        }
        return;
    }

    setButtonLoading(btn, true, "Generating...");

    try {
        const rawCount = countInput ? countInput.value.trim() : "";
        let count = rawCount ? parseInt(rawCount, 10) : undefined;
        if (count !== undefined && !Number.isNaN(count) && currentPlanLimits?.maxQuizQuestionsPerSet) {
            count = Math.min(count, currentPlanLimits.maxQuizQuestionsPerSet);
        }

        const difficulty = difficultySelect ? difficultySelect.value : "MIXED";
        await AiLearningAPI.generateQuizSet(
            currentDocumentId,
            Number.isNaN(count) ? undefined : count,
            difficulty,
            focusRaw || undefined
        );
        showToast("Quiz generated successfully", "success");
        if (focusInput) focusInput.value = "";
        updateFocusCharCount("quizFocusInput", "quizFocusCount");
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
            } else if (code === "INVALID_GENERATION_FOCUS") {
                errorMsg = "Focus text is invalid or too long. Please shorten it.";
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
function renderSetList(listEl, emptyEl, sets, detailUrlPrefix, type) {
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

        const contentDiv = document.createElement("div");
        contentDiv.className = "ai-tools-set-content";

        const titleRow = document.createElement("div");
        titleRow.className = "ai-tools-set-title-row";
        
        const badgeSpan = document.createElement("span");
        badgeSpan.className = "ai-tools-set-badge";
        badgeSpan.textContent = type === "flashcard" ? "Flashcards" : "Quiz";

        const titleSpan = document.createElement("span");
        titleSpan.className = "ai-tools-set-title";
        titleSpan.textContent = set.title || (type === "flashcard" ? "Flashcard set" : "Quiz");

        titleRow.appendChild(badgeSpan);
        titleRow.appendChild(titleSpan);

        const metaSpan = document.createElement("span");
        metaSpan.className = "ai-tools-set-meta";
        let metaText = "";
        if (type === "flashcard") {
            metaText = `${set.itemCount || 0} cards · ${formatGeneratedAt(set.createdAt)}`;
        } else {
            const diff = set.difficulty || "Mixed";
            const formattedDiff = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
            metaText = `${set.questionCount || 0} questions · ${formattedDiff} · ${formatGeneratedAt(set.createdAt)}`;
        }
        metaSpan.textContent = metaText;

        contentDiv.appendChild(titleRow);
        contentDiv.appendChild(metaSpan);

        const openBtn = document.createElement("span");
        openBtn.className = "ai-tools-set-open";
        openBtn.textContent = "Open";

        link.appendChild(contentDiv);
        link.appendChild(openBtn);
        li.appendChild(link);
        listEl.appendChild(li);
    });
}

function initAiToolsHandlers() {
    const flashcardBtn = document.getElementById("flashcardGenerateBtn");
    const quizBtn = document.getElementById("quizGenerateBtn");

    if (flashcardBtn) flashcardBtn.addEventListener("click", handleGenerateFlashcardSet);
    if (quizBtn) quizBtn.addEventListener("click", handleGenerateQuizSet);

    const flashcardFocusInput = document.getElementById("flashcardFocusInput");
    if (flashcardFocusInput) {
        flashcardFocusInput.addEventListener("input", () =>
            updateFocusCharCount("flashcardFocusInput", "flashcardFocusCount")
        );
    }
    const quizFocusInput = document.getElementById("quizFocusInput");
    if (quizFocusInput) {
        quizFocusInput.addEventListener("input", () =>
            updateFocusCharCount("quizFocusInput", "quizFocusCount")
        );
    }
    setupFocusToggle("flashcardFocusToggle", "flashcardFocusContainer");
    setupFocusToggle("quizFocusToggle", "quizFocusContainer");

    const flashcardCountInput = document.getElementById("flashcardCountInput");
    if (flashcardCountInput) {
        flashcardCountInput.addEventListener("blur", () => {
            const max = currentPlanLimits?.maxFlashcardsPerSet;
            const val = parseInt(flashcardCountInput.value, 10);
            if (max && !Number.isNaN(val) && val > max) {
                flashcardCountInput.value = max;
            }
        });
    }
    const quizCountInput = document.getElementById("quizCountInput");
    if (quizCountInput) {
        quizCountInput.addEventListener("blur", () => {
            const max = currentPlanLimits?.maxQuizQuestionsPerSet;
            const val = parseInt(quizCountInput.value, 10);
            if (max && !Number.isNaN(val) && val > max) {
                quizCountInput.value = max;
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", initAiToolsHandlers);

// ── Danger Zone collapse toggle ───────────────────────────────────────────
function toggleDangerZone() {
    const toggle = document.getElementById("dangerZoneToggle");
    const body = document.getElementById("dangerZoneBody");
    if (!toggle || !body) return;
    const nextOpen = !body.classList.contains("open");
    body.classList.toggle("open", nextOpen);
    toggle.classList.toggle("open", nextOpen);
    body.style.display = nextOpen ? "block" : "none";
    toggle.setAttribute("aria-expanded", String(nextOpen));

    const chevron = document.getElementById("dangerChevron");
    if (chevron) {
        chevron.style.transform = nextOpen ? "rotate(180deg)" : "rotate(0deg)";
    }
}

window.toggleDangerZone = toggleDangerZone;

function renderContextualTopBar(doc) {
    let globalHeader = document.getElementById("globalTopBar");
    const topBarDoc = doc || currentDocumentForTopBar || window.currentDocumentDetailForTopBar || null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get("from");
    
    let backLabel = "← Back to My Folders";
    let backUrl = "my-library.html?view=folders";
    
    if (fromParam === "community" || currentIsCommunityView) {
        backLabel = "← Back to Community Library";
        backUrl = "community.html";
    } else if (fromParam === "shared") {
        backLabel = "← Back to Shared with Me";
        backUrl = "shared-with-me.html";
    } else if (fromParam === "folders") {
        backLabel = "← Back to My Folders";
        backUrl = "folders.html";
    } else if (fromParam === "mylibrary_folders") {
        const folderId = urlParams.get("folderId");
        const folderName = urlParams.get("folderName");
        if (folderId && folderName) {
            backLabel = `← Back to ${decodeURIComponent(folderName)}`;
            backUrl = `my-library.html?view=folders&folderId=${folderId}`;
        } else {
            backLabel = "← Back to My Folders";
            backUrl = "my-library.html?view=folders";
        }
    } else if (fromParam === "mylibrary_documents") {
        backLabel = "← Back to My Documents";
        backUrl = "my-library.html?view=documents";
    } else if (fromParam === "mylibrary_favorites") {
        backLabel = "← Back to Favorites";
        backUrl = "my-library.html?view=favorites";
    }

    // Hide duplicate detailBackBtn from right inspector panel
    const detailBackBtn = document.getElementById("detailBackBtn");
    if (detailBackBtn) {
        detailBackBtn.style.display = "none";
    }

    if (!globalHeader) {
        globalHeader = document.createElement("header");
        globalHeader.className = "global-top-bar-floating";
        globalHeader.id = "globalTopBar";
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            mainContent.insertBefore(globalHeader, mainContent.firstChild);
        } else {
            return;
        }
    }
    
    const subjectText = topBarDoc ? (topBarDoc.subject ? topBarDoc.subject : (topBarDoc.subjectName ? `${topBarDoc.subjectCode} - ${topBarDoc.subjectName}` : "")) : "";
    const docTitleText = topBarDoc ? topBarDoc.title : "";
    const breadcrumbText = subjectText ? `${subjectText} / ${docTitleText}` : docTitleText;
    
    let contextualContainer = globalHeader.querySelector(".top-bar-contextual");
    if (!contextualContainer) {
        contextualContainer = document.createElement("div");
        contextualContainer.className = "top-bar-contextual";
        contextualContainer.style.cssText = "display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; padding-right: 12px;";
        globalHeader.insertBefore(contextualContainer, globalHeader.firstChild);
    }

    contextualContainer.innerHTML = `
        <a href="${backUrl}" class="top-bar-back-link" style="display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; transition: color 0.2s;">
            ${backLabel}
        </a>
        ${docTitleText ? `<span style="color: var(--border); font-size: 12px;">/</span>
        <span class="top-bar-breadcrumb" style="font-size: 13px; color: var(--text); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 480px;" title="${breadcrumbText}">
            ${breadcrumbText}
        </span>` : ''}
    `;
}

function initTopBarSearch() {
    renderContextualTopBar(null);
}

window.renderContextualTopBar = renderContextualTopBar;

// ── Ratings & Reports System (Step 17A) ──
async function initRatingReportingWidget(doc) {
    const isPublicApproved = doc.visibility === "PUBLIC" && doc.approvalStatus === "APPROVED" && (doc.status === undefined || doc.status === "ACTIVE");
    const section = document.getElementById("ratingReportingSection");
    if (!section) return;

    if (!isPublicApproved) {
        section.style.display = "none";
        return;
    }

    section.style.display = "flex";

    const starContainer = document.getElementById("interactiveStars");
    const avgText = document.getElementById("averageRatingText");
    const countText = document.getElementById("ratingCountText");
    const reportBlock = document.getElementById("documentReportBlock");
    const alreadyReportedBadge = document.getElementById("alreadyReportedBadge");
    const openReportModalBtn = document.getElementById("openReportModalBtn");

    let averageRating = doc.averageRating || 0.0;
    let ratingCount = doc.ratingCount || 0;
    let myRating = doc.myRating || null;
    let canRate = doc.canRate || false;
    let canReport = doc.canReport || false;
    let reportedByMe = doc.reportedByMe || false;

    function updateRatingUI() {
        const avgNum = Number(averageRating);
        avgText.textContent = avgNum === 0 ? "0" : (avgNum % 1 === 0 ? avgNum.toFixed(0) : avgNum.toFixed(1)) + "/5";
        countText.textContent = `(${ratingCount} rating${ratingCount === 1 ? '' : 's'})`;

        starContainer.innerHTML = "";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("span");
            star.className = "star";
            star.innerHTML = "★";
            star.dataset.value = i;

            if (myRating && i <= myRating) {
                star.classList.add("filled");
            } else if (!myRating && i <= Math.round(averageRating)) {
                star.classList.add("filled");
                star.style.opacity = "0.5";
            }

            if (canRate) {
                star.addEventListener("mouseenter", () => {
                    highlightStars(i);
                });
                star.addEventListener("mouseleave", () => {
                    resetStars();
                });
                star.addEventListener("click", () => {
                    handleRate(i);
                });
            } else {
                star.classList.add("disabled");
            }
            starContainer.appendChild(star);
        }
    }

    function highlightStars(val) {
        const stars = starContainer.querySelectorAll(".star");
        stars.forEach(s => {
            const v = parseInt(s.dataset.value);
            if (v <= val) {
                s.classList.add("hover");
            } else {
                s.classList.remove("hover");
            }
        });
    }

    function resetStars() {
        const stars = starContainer.querySelectorAll(".star");
        stars.forEach(s => {
            s.classList.remove("hover");
        });
    }

    async function handleRate(ratingValue) {
        if (!currentIsAuthenticated) {
            showToast("Please log in to rate this document.", "warning");
            setTimeout(() => {
                window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            }, 1500);
            return;
        }

        try {
            const oldRating = myRating;
            myRating = ratingValue;
            updateRatingUI();

            const res = await rateDocument(doc.documentId, ratingValue);
            if (res && res.success) {
                showToast("Thank you for your rating!", "success");
                const sumRes = await getRatingsSummary(doc.documentId);
                if (sumRes && sumRes.success) {
                    averageRating = sumRes.data.averageRating;
                    ratingCount = sumRes.data.ratingCount;
                    myRating = sumRes.data.myRating;
                    canRate = sumRes.data.canRate;
                    updateRatingUI();
                }
            } else {
                myRating = oldRating;
                updateRatingUI();
                showToast(res.message || "Failed to submit rating.", "danger");
            }
        } catch (err) {
            showToast(err.message || "Failed to submit rating.", "danger");
        }
    }

    if (reportedByMe) {
        reportBlock.style.display = "none";
        alreadyReportedBadge.style.display = "block";
    } else {
        reportBlock.style.display = "flex";
        alreadyReportedBadge.style.display = "none";
    }

    if (openReportModalBtn) {
        openReportModalBtn.onclick = () => {
            if (!currentIsAuthenticated) {
                showToast("Please log in to report a violation.", "warning");
                setTimeout(() => {
                    window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
                }, 1500);
                return;
            }
            const modal = document.getElementById("documentReportModal");
            const reasonSelect = document.getElementById("reportReasonSelect");
            const descInput = document.getElementById("reportDescriptionInput");
            const charCount = document.getElementById("reportCharCount");
            const modalError = document.getElementById("reportModalError");

            reasonSelect.value = "";
            descInput.value = "";
            charCount.textContent = "0/500";
            modalError.style.display = "none";

            modal.classList.add("show");

            descInput.oninput = () => {
                charCount.textContent = `${descInput.value.length}/500`;
            };

            document.getElementById("cancelReportBtn").onclick = () => {
                modal.classList.remove("show");
            };

            document.getElementById("confirmReportBtn").onclick = async () => {
                const reason = reasonSelect.value;
                const desc = descInput.value.trim();

                if (!reason) {
                    modalError.textContent = "Please select a reason.";
                    modalError.style.display = "block";
                    return;
                }

                try {
                    const res = await reportDocument(doc.documentId, { reason, description: desc });
                    if (res && res.success) {
                        modal.classList.remove("show");
                        showToast("Violation report submitted. Thank you!", "success");
                        reportBlock.style.display = "none";
                        alreadyReportedBadge.style.display = "block";
                    } else {
                        modalError.textContent = res.message || "Failed to submit report.";
                        modalError.style.display = "block";
                    }
                } catch (err) {
                    modalError.textContent = err.message || "Failed to submit report.";
                    modalError.style.display = "block";
                }
            };
        };
    }

    updateRatingUI();
}

window.initRatingReportingWidget = initRatingReportingWidget;

