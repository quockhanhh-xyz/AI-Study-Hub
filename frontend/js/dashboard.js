/**
 * Simplified Dashboard Controller (FE1 - Step 6D).
 * Provides an overview of study statistics, dynamic storage quota,
 * and lists the 3-5 most recent documents.
 * All folder hierarchies, document searches/filters, and folder modals
 * are moved to their respective specialized pages.
 */
document.addEventListener("DOMContentLoaded", async function () {
  if (window.authReady) {
    const isAuthenticated = await window.authReady;
    if (!isAuthenticated) return;
  }

  // User details
  const userNameElement = document.getElementById("dashboardUserName");
  const currentUserRaw = localStorage.getItem("currentUser");
  let currentUser = {};

  try {
    currentUser = JSON.parse(currentUserRaw || "{}");
  } catch (error) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  if (userNameElement && currentUser.fullName) {
    userNameElement.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
  }

  // Stat elements
  const docCountElement = document.getElementById("docCount");
  const folderCountElement = document.getElementById("folderCount");
  const sharedCountElement = document.getElementById("sharedCount");
  const groupCountElement = document.getElementById("groupCount");
  const accountTierElement = document.getElementById("accountTier");
  const usageRemainingElement = document.getElementById("usageRemaining");
  const usageProgressBar = document.getElementById("usageProgressBar");

  // Document list elements
  const documentLoader = document.getElementById("documentLoader");
  const documentErrorMessage = document.getElementById("documentErrorMessage");
  const documentGrid = document.getElementById("documentGrid");
  const emptyState = document.getElementById("emptyState");

  // Account tier styling
  if (accountTierElement) {
    const tier = currentUser.tier || "FREE";
    accountTierElement.textContent = tier;
    accountTierElement.classList.remove("badge-tier-free", "badge-tier-premium");
    accountTierElement.classList.add(tier === "PREMIUM" ? "badge-tier-premium" : "badge-tier-free");
  }

  function setDocumentsLoading() {
    if (documentLoader) documentLoader.style.display = "flex";
    if (documentGrid) documentGrid.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (documentErrorMessage) documentErrorMessage.style.display = "none";
  }

  function formatFileSize(bytes) {
    if (bytes === undefined || bytes === null) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function getFileLabel(fileType) {
    return (fileType || "FILE").toUpperCase();
  }

  function createMetaItem(label, value) {
    const item = document.createElement("span");
    item.textContent = `${label}: ${value}`;
    return item;
  }

  function createDocumentCard(documentItem) {
    const card = document.createElement("article");
    card.className = "document-card";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const fileBadge = document.createElement("span");
    fileBadge.className = "document-type-badge";
    fileBadge.textContent = getFileLabel(documentItem.fileType);

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    titleLink.style.color = "inherit";
    title.appendChild(titleLink);

    header.append(fileBadge, title);

    const description = document.createElement("p");
    description.className = "document-description";
    description.textContent = documentItem.description || "No description provided.";

    const meta = document.createElement("div");
    meta.className = "document-meta";
    meta.append(
      createMetaItem("Size", formatFileSize(documentItem.fileSize)),
      createMetaItem("Uploaded", formatDate(documentItem.createdAt))
    );

    if (documentItem.subjectCode) {
      const subjectBadge = document.createElement("div");
      subjectBadge.className = "document-card-subject";
      subjectBadge.textContent = `${documentItem.subjectCode} - ${documentItem.subjectName}`;
      meta.append(subjectBadge);
    }

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const detailButton = document.createElement("a");
    detailButton.href = `document-detail.html?id=${documentItem.documentId}`;
    detailButton.className = "btn btn-primary document-detail-btn";
    detailButton.textContent = "View Details";

    actions.append(detailButton);
    card.append(header, description, meta, actions);

    return card;
  }

  // Dynamic Statistics Loading
  async function loadOverviewStats(documents) {
    // 1. Documents Count
    if (docCountElement) {
      docCountElement.textContent = String(documents.length);
    }

    // 2. Folders Count
    try {
      const foldersRes = await getMyFolders(null, true);
      const folders = Array.isArray(foldersRes.data) ? foldersRes.data : [];
      if (folderCountElement) {
        folderCountElement.textContent = String(folders.length);
      }
    } catch (e) {
      console.warn("Failed to load folders count:", e);
      if (folderCountElement) folderCountElement.textContent = "0";
    }

    // 3. Shared Items Count
    let sharedDocsCount = 0;
    let sharedFoldersCount = 0;
    try {
      const sharedDocsRes = await getSharedWithMe();
      const sharedDocs = Array.isArray(sharedDocsRes.data) ? sharedDocsRes.data : (Array.isArray(sharedDocsRes) ? sharedDocsRes : []);
      sharedDocsCount = sharedDocs.length;
    } catch (e) {
      console.warn("Failed to load shared documents:", e);
    }
    try {
      const sharedFoldersRes = await getFoldersSharedWithMe();
      const sharedFolders = Array.isArray(sharedFoldersRes.data) ? sharedFoldersRes.data : (Array.isArray(sharedFoldersRes) ? sharedFoldersRes : []);
      sharedFoldersCount = sharedFolders.length;
    } catch (e) {
      console.warn("Failed to load shared folders:", e);
    }
    if (sharedCountElement) {
      sharedCountElement.textContent = String(sharedDocsCount + sharedFoldersCount);
    }

    // 4. Study Groups Count
    try {
      const groupsRes = await getMyGroups();
      const groups = Array.isArray(groupsRes.data) ? groupsRes.data : (Array.isArray(groupsRes) ? groupsRes : []);
      if (groupCountElement) {
        groupCountElement.textContent = String(groups.length);
      }
    } catch (e) {
      console.warn("Failed to load study groups count:", e);
      if (groupCountElement) groupCountElement.textContent = "0";
    }

    // 5. Storage Quota Calculation
    const tier = currentUser.tier || "FREE";
    const maxQuotaBytes = tier === "PREMIUM" ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB or 100MB
    const totalBytesUsed = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

    if (usageRemainingElement) {
      const usedFormatted = formatFileSize(totalBytesUsed);
      const quotaFormatted = formatFileSize(maxQuotaBytes);
      usageRemainingElement.textContent = `${usedFormatted} / ${quotaFormatted}`;
    }

    if (usageProgressBar) {
      const percentage = Math.min((totalBytesUsed / maxQuotaBytes) * 100, 100);
      usageProgressBar.style.width = `${percentage}%`;
    }
  }

  // Load and Render Recent Activity
  async function loadRecentDocuments() {
    setDocumentsLoading();

    try {
      // Fetch all owned documents to calculate stats and sort them
      const result = await searchDocuments({});
      const documents = Array.isArray(result.data) ? result.data : [];

      // Calculate overview statistics
      await loadOverviewStats(documents);

      if (documentLoader) documentLoader.style.display = "none";

      if (documents.length === 0) {
        if (documentGrid) documentGrid.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        return;
      }

      // Sort by creation date descending, take top 5 items
      const recentDocs = [...documents]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      if (documentGrid) {
        documentGrid.innerHTML = "";
        recentDocs.forEach(function (doc) {
          documentGrid.appendChild(createDocumentCard(doc));
        });
        documentGrid.style.display = "grid";
      }
    } catch (error) {
      if (documentLoader) documentLoader.style.display = "none";
      if (documentGrid) documentGrid.style.display = "none";
      if (emptyState) emptyState.style.display = "none";
      if (documentErrorMessage) {
        documentErrorMessage.textContent = error.message || "Failed to load recent activity.";
        documentErrorMessage.style.display = "flex";
      }
    }
  }

  // Initial Execution
  await loadRecentDocuments();
});