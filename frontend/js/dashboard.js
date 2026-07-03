/**
 * Simplified Dashboard Controller (FE1 - Step 6D).
 * Provides an overview of study statistics, storage used,
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
  const quotaProgressContainer = document.getElementById("quotaProgressContainer");

  // Document list elements
  const documentLoader = document.getElementById("documentLoader");
  const documentErrorMessage = document.getElementById("documentErrorMessage");
  const documentGrid = document.getElementById("documentGrid");
  const emptyState = document.getElementById("emptyState");

  // Account tier styling
  const dashboardUpgradeCta = document.getElementById("dashboardUpgradeCta");
  if (accountTierElement) {
    const tier = currentUser.tier || "FREE";
    accountTierElement.textContent = tier;
    accountTierElement.classList.remove("badge-tier-free", "badge-tier-premium");
    accountTierElement.classList.add(tier === "PREMIUM" ? "badge-tier-premium" : "badge-tier-free");

    if (dashboardUpgradeCta) {
      dashboardUpgradeCta.style.display = tier === "PREMIUM" ? "none" : "inline-flex";
    }
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

    // Left Column: The Large File Type Icon
    const iconContainer = document.createElement("div");
    iconContainer.innerHTML = getFileTypeIcon(documentItem.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    card.appendChild(iconWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    titleLink.style.color = "inherit";
    title.appendChild(titleLink);
    header.appendChild(title);

    const description = document.createElement("p");
    description.className = "document-description";
    if (documentItem.description) {
      description.textContent = documentItem.description;
    } else {
      description.style.display = "none";
    }

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(documentItem.createdAt)}`;
    meta.append(dateItem);

    if (documentItem.subjectCode) {
      const subjectItem = document.createElement("span");
      subjectItem.className = "document-meta-item";
      subjectItem.title = `${documentItem.subjectCode} - ${documentItem.subjectName}`;
      subjectItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg> ${documentItem.subjectCode} - ${documentItem.subjectName}`;
      meta.append(subjectItem);
    }

    content.append(header, description, meta);
    card.appendChild(content);

    card.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("a")) {
        return;
      }
      window.location.href = `document-detail.html?id=${documentItem.documentId}`;
    });

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
    const totalBytesUsed = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
    if (usageRemainingElement) {
      usageRemainingElement.textContent = formatFileSize(totalBytesUsed);
    }
    if (quotaProgressContainer) {
      quotaProgressContainer.style.display = "none";
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
