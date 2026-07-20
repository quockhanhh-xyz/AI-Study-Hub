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
  let userFolders = [];

  try {
    currentUser = JSON.parse(currentUserRaw || "{}");
  } catch (error) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  const GREETING_ICON_MORNING = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.25 4.75V1h1.5v3.75h-1.5Zm6.4 2.65 -1.05 -1.05 2.65 -2.675 1.05 1.075 -2.65 2.65Zm1.6 5.35v-1.5H23v1.5h-3.75ZM11.25 23v-3.75h1.5V23h-1.5Zm-4.925 -15.625L3.7 4.75l1.05 -1.05 2.65 2.65 -1.075 1.025Zm12.95 12.925 -2.675 -2.65 1.025 -1.025 2.7 2.6 -1.05 1.075ZM1 12.75v-1.5h3.75v1.5H1Zm3.775 7.55L3.7 19.25l2.625 -2.625 0.55 0.5 0.55 0.525 -2.65 2.65ZM12 18c-1.66665 0 -3.08335 -0.58335 -4.25 -1.75 -1.16665 -1.16665 -1.75 -2.58335 -1.75 -4.25 0 -1.66665 0.58335 -3.08335 1.75 -4.25 1.16665 -1.16665 2.58335 -1.75 4.25 -1.75 1.66665 0 3.08335 0.58335 4.25 1.75 1.16665 1.16665 1.75 2.58335 1.75 4.25 0 1.66665 -0.58335 3.08335 -1.75 4.25 -1.16665 1.16665 -2.58335 1.75 -4.25 1.75Zm0 -1.5c1.25 0 2.3125 -0.4375 3.1875 -1.3125S16.5 13.25 16.5 12s-0.4375 -2.3125 -1.3125 -3.1875S13.25 7.5 12 7.5s-2.3125 0.4375 -3.1875 1.3125S7.5 10.75 7.5 12s0.4375 2.3125 1.3125 3.1875S10.75 16.5 12 16.5Z"></path></svg>';
  const GREETING_ICON_AFTERNOON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.25 4.75V1h1.5v3.75h-1.5Zm6.4 2.65 -1.05 -1.075 2.65 -2.65 1.05 1.075 -2.65 2.65Zm1.6 5.35v-1.5H23v1.5h-3.75Zm0.025 7.55 -2.65 -2.65 1.075 -1.075 2.65 2.65 -1.075 1.075ZM6.35 7.4 3.7 4.75l1.05 -1.05 2.65 2.65 -1.05 1.05ZM6 19.5h4.5c0.5555 0 1.02775 -0.19385 1.41675 -0.5815C12.3056 18.53065 12.5 18.05985 12.5 17.506c0 -0.554 -0.18965 -1.031 -0.569 -1.431 -0.3795 -0.4 -0.84815 -0.6 -1.406 -0.6h-1.1l-0.45 -1.025c-0.2525 -0.59585 -0.64915 -1.06985 -1.19 -1.422C7.24415 12.676 6.64915 12.5 6 12.5c-0.97215 0 -1.798585 0.33965 -2.47925 1.019C2.84025 14.1985 2.5 15.0235 2.5 15.994c0 0.97065 0.34025 1.79765 1.02075 2.481C4.201415 19.15835 5.02785 19.5 6 19.5Zm0 1.5c-1.383335 0 -2.5625 -0.4875 -3.5375 -1.4625C1.4875 18.5625 1 17.38335 1 16s0.4875 -2.5625 1.4625 -3.5375C3.4375 11.4875 4.616665 11 6 11c0.96235 0 1.8404 0.27085 2.63425 0.8125 0.79385 0.54165 1.3824 1.2625 1.76575 2.1625 1.002 0 1.84415 0.36325 2.5265 1.08975 0.68235 0.7265 1.0235 1.5966 1.0235 2.61025 -0.08335 0.93335 -0.45025 1.72085 -1.10075 2.3625C12.1986 20.67915 11.4155 21 10.5 21h-4.5Zm7.95 -3.325c-0.05 -0.25635 -0.1 -0.50635 -0.15 -0.75 -0.05 -0.24365 -0.1 -0.49365 -0.15 -0.75 0.86665 -0.33335 1.55835 -0.8795 2.075 -1.6385 0.51665 -0.759 0.775 -1.60335 0.775 -2.533 0 -1.25235 -0.4375 -2.316 -1.3125 -3.191S13.25 7.5 12 7.5c-1.12035 0 -2.1006 0.3556 -2.94075 1.06675 -0.84015 0.71135 -1.3349 1.6141 -1.48425 2.70825 -0.26665 -0.05 -0.52915 -0.09585 -0.7875 -0.1375 -0.25835 -0.04165 -0.52085 -0.0875 -0.7875 -0.1375 0.23335 -1.46665 0.92085 -2.66665 2.0625 -3.6C9.20415 6.46665 10.51665 6 12 6c1.66665 0 3.08335 0.58335 4.25 1.75 1.16665 1.16665 1.75 2.58615 1.75 4.2585 0 1.29435 -0.37085 2.45815 -1.1125 3.4915s-1.72085 1.75835 -2.9375 2.175Z"></path></svg>';
  const GREETING_ICON_EVENING = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20" width="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 21c-2.5 0 -4.625 -0.875 -6.375 -2.625S3 14.5 3 12s0.875 -4.625 2.625 -6.375S9.5 3 12 3c0.13335 0 0.275 0.004165 0.425 0.0125 0.15 0.008335 0.34165 0.020835 0.575 0.0375 -0.6 0.533335 -1.06665 1.191665 -1.4 1.975 -0.33335 0.78335 -0.5 1.60835 -0.5 2.475 0 1.5 0.525 2.775 1.575 3.825 1.05 1.05 2.325 1.575 3.825 1.575 0.86665 0 1.69165 -0.15415 2.475 -0.4625S20.41665 11.7 20.95 11.15c0.01665 0.2 0.02915 0.3625 0.0375 0.4875S21 11.88335 21 12c0 2.5 -0.875 4.625 -2.625 6.375S14.5 21 12 21Zm0 -1.5c1.81665 0 3.4 -0.5625 4.75 -1.6875s2.19165 -2.44585 2.525 -3.9625c-0.41665 0.18335 -0.8639 0.32085 -1.34175 0.4125 -0.47765 0.09165 -0.9554 0.1375 -1.43325 0.1375 -1.9115 0 -3.53935 -0.67215 -4.8835 -2.0165C10.27215 11.03935 9.6 9.4115 9.6 7.5c0 -0.4 0.04165 -0.82915 0.125 -1.2875 0.08335 -0.45835 0.23335 -0.97915 0.45 -1.5625 -1.63335 0.45 -2.9875 1.3625 -4.0625 2.7375C5.0375 8.7625 4.5 10.3 4.5 12c0 2.08335 0.72915 3.85415 2.1875 5.3125C8.14585 18.77085 9.91665 19.5 12 19.5Z"></path></svg>';

  function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: GREETING_ICON_MORNING };
    if (hour < 18) return { text: "Good afternoon", icon: GREETING_ICON_AFTERNOON };
    return { text: "Good evening", icon: GREETING_ICON_EVENING };
  }

  if (userNameElement && currentUser.fullName) {
    const greeting = getTimeBasedGreeting();

    // Security: fullName is user-supplied data (entered at registration),
    // so it must go through textContent (auto-escaped), never innerHTML.
    // Only the icon markup below is a trusted, hardcoded constant string.
    userNameElement.textContent = `${greeting.text}, ${currentUser.fullName}! `;

    const iconWrapper = document.createElement("span");
    iconWrapper.style.display = "inline-flex";
    iconWrapper.style.verticalAlign = "-4px";
    iconWrapper.innerHTML = greeting.icon;
    userNameElement.appendChild(iconWrapper);
  }

  // Search Form Redirection (Dashboard Search Bar)
  const searchForm = document.getElementById("dashboardSearchForm");
  const searchInput = document.getElementById("dashboardSearchInput");
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (val) {
        window.location.href = `my-library.html?view=documents&search=${encodeURIComponent(val)}`;
      }
    });
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
  const documentList = document.getElementById("documentList");
  const emptyState = document.getElementById("emptyState");

  // Account tier & entitlements (Step 13)
  const dashboardUpgradeCta = document.getElementById("dashboardUpgradeCta");

  async function loadAccountTierAndUsage() {
    // Fallback tier from localStorage, in case entitlements API isn't ready yet
    let tier = currentUser.tier || "FREE";
    let usageData = null;

    try {
      const entitlementsRes = await getAccountEntitlements();
      const entitlements = entitlementsRes.data || entitlementsRes;
      tier = entitlements.tier || tier;
    } catch (error) {
      // Backend entitlements API may not be deployed yet — silently fall back
      console.warn("Entitlements API unavailable, using cached tier:", error.message);
    }

    // Render tier badge using FE3's shared helper (supports FREE / PREMIUM / ULTRA)
    if (accountTierElement && typeof renderTierBadge === "function") {
      renderTierBadge(accountTierElement, tier);
    } else if (accountTierElement) {
      accountTierElement.textContent = tier;
    }

    if (dashboardUpgradeCta) {
      if (tier === "ULTRA") {
        dashboardUpgradeCta.style.display = "none";
      } else if (tier === "PREMIUM") {
        dashboardUpgradeCta.textContent = "Manage Plan";
        dashboardUpgradeCta.classList.remove("btn-primary");
        dashboardUpgradeCta.classList.add("btn-secondary");
        dashboardUpgradeCta.style.display = "inline-flex";
      } else {
        dashboardUpgradeCta.textContent = "Upgrade Plan";
        dashboardUpgradeCta.classList.remove("btn-secondary");
        dashboardUpgradeCta.classList.add("btn-primary");
        dashboardUpgradeCta.style.display = "inline-flex";
      }
    }

    // Usage data (storage, documents, etc.)
    try {
      const usageRes = await getAccountUsage();
      usageData = usageRes.data || usageRes;
    } catch (error) {
      console.warn("Usage API unavailable:", error.message);
      if (error.status === 403 && typeof showQuotaError === "function") {
        showQuotaError(error);
      }
    }

    return usageData;
  }

  function setDocumentsLoading() {
    if (documentLoader) documentLoader.style.display = "flex";
    if (documentList) documentList.style.display = "none";
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

  function createDocumentCard(documentItem) {
    const row = document.createElement("div");
    row.className = "dashboard-document-row";

    // Column 1: File Type Icon
    const iconContainer = document.createElement("div");
    iconContainer.className = "row-file-icon";
    iconContainer.innerHTML = getFileTypeIcon(documentItem.fileType);
    row.appendChild(iconContainer);

    // Column 2: Title and Subject/Folder inline badges
    const infoCol = document.createElement("div");
    infoCol.className = "row-info-col";

    const titleLink = document.createElement("a");
    titleLink.href = `document-detail.html?id=${documentItem.documentId}`;
    titleLink.className = "row-title-link";
    titleLink.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";
    infoCol.appendChild(titleLink);

    // Metadata row (Subject • Folder)
    const metaRow = document.createElement("div");
    metaRow.className = "row-meta-sub";

    if (documentItem.subjectCode) {
      const subjectTag = document.createElement("span");
      subjectTag.className = "meta-tag meta-subject";
      subjectTag.textContent = `${documentItem.subjectCode} - ${documentItem.subjectName}`;
      metaRow.appendChild(subjectTag);
    } else {
      const generalTag = document.createElement("span");
      generalTag.className = "meta-tag";
      generalTag.textContent = "General";
      metaRow.appendChild(generalTag);
    }

    // Lookup folder name from userFolders
    if (documentItem.folderId) {
      const matchedFolder = userFolders.find(f => f.folderId === documentItem.folderId);
      if (matchedFolder) {
        // Separator dot
        const sep = document.createElement("span");
        sep.className = "meta-separator";
        sep.textContent = "•";
        metaRow.appendChild(sep);

        const folderTag = document.createElement("span");
        folderTag.className = "meta-tag meta-folder";
        folderTag.textContent = matchedFolder.folderName;
        metaRow.appendChild(folderTag);
      }
    }

    infoCol.appendChild(metaRow);
    row.appendChild(infoCol);

    // Column 3: Upload Date
    const dateCol = document.createElement("div");
    dateCol.className = "row-date-col";
    dateCol.textContent = formatDate(documentItem.createdAt);
    row.appendChild(dateCol);

    // Column 4: Actions (Chevron arrow instead of Open button)
    const actionsCol = document.createElement("div");
    actionsCol.className = "row-actions-col";
    actionsCol.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="16" height="16" class="chevron-arrow">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
    `;
    row.appendChild(actionsCol);

    row.addEventListener("click", function (e) {
      if (e.target.closest("a") || e.target.closest("button")) {
        return;
      }
      window.location.href = `document-detail.html?id=${documentItem.documentId}`;
    });

    return row;
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
      userFolders = Array.isArray(foldersRes.data) ? foldersRes.data : [];
      if (folderCountElement) {
        folderCountElement.textContent = String(userFolders.length);
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

    // 5. Storage Quota Calculation (Step 13: only show real backend usage/limits;
    // never compute or estimate quota locally, per the "FE does not hardcode
    // quota" rule — if the backend usage API is unavailable, say so plainly
    // instead of silently substituting a locally-computed number).
    const usageData = await loadAccountTierAndUsage();

    if (usageData && usageData.storage) {
      const usedBytes = usageData.storage.used ?? 0;
      const limitBytes = usageData.storage.limit ?? 0;

      if (usageRemainingElement && limitBytes > 0) {
        const percent = Math.min((usedBytes / limitBytes) * 100, 100).toFixed(0);
        const formattedUsage = typeof formatUsageProgress === "function"
          ? formatUsageProgress(usedBytes, limitBytes, "storage")
          : formatFileSize(usedBytes);
        usageRemainingElement.textContent = `${formattedUsage} (${percent}% used)`;
      } else if (usageRemainingElement) {
        usageRemainingElement.textContent = formatFileSize(usedBytes);
      }

      if (quotaProgressContainer && limitBytes > 0) {
        const percent = Math.min((usedBytes / limitBytes) * 100, 100);
        const isCritical = percent >= 90;
        const bar = document.getElementById("usageProgressBar");
        if (bar) {
          bar.style.width = `${percent}%`;
          bar.classList.remove("quota-low", "quota-medium", "quota-critical");
          if (percent >= 90) {
            bar.classList.add("quota-critical");
          } else if (percent >= 70) {
            bar.classList.add("quota-medium");
          } else {
            bar.classList.add("quota-low");
          }
        }
        if (usageRemainingElement) {
          usageRemainingElement.classList.toggle("stat-value-danger", isCritical);
        }
        quotaProgressContainer.style.display = "block";
      } else if (quotaProgressContainer) {
        quotaProgressContainer.style.display = "none";
      }
    } else {
      // Backend usage API unavailable — show an explicit unavailable state
      // rather than a locally-estimated number.
      if (usageRemainingElement) {
        usageRemainingElement.textContent = "Usage unavailable";
      }
      if (quotaProgressContainer) {
        quotaProgressContainer.style.display = "none";
      }
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
        if (documentList) documentList.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        return;
      }

      // Sort by creation date descending, take top 5 items
      const recentDocs = [...documents]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      if (documentList) {
        documentList.innerHTML = "";
        recentDocs.forEach(function (doc) {
          documentList.appendChild(createDocumentCard(doc));
        });
        documentList.style.display = "block";
      }
    } catch (error) {
      if (documentLoader) documentLoader.style.display = "none";
      if (documentList) documentList.style.display = "none";
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
