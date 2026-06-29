/**
 * Public Community Library Page Controller (Step 8 - FE2).
 * Handles search, subject/file-type filters, and sort for PUBLIC + APPROVED
 * + ACTIVE + not-in-trash documents. Works for both guest and logged-in users.
 */

document.addEventListener("DOMContentLoaded", async function () {
  // Community page must NOT gate on auth — guest can use it freely.
  // We still let layout.js run (it never redirects here because
  // "community.html" will be registered with requiresAuth: false).
  let isAuthenticated = false;
  if (window.authReady) {
    isAuthenticated = await window.authReady;
  }

  // Guest CTA banner
  const guestCtaBanner = document.getElementById("guestCtaBanner");
  const authCtaBanner = document.getElementById("authCtaBanner");
  if (guestCtaBanner) {
    guestCtaBanner.style.display = isAuthenticated ? "none" : "flex";
  }
  if (authCtaBanner) {
    authCtaBanner.style.display = isAuthenticated ? "flex" : "none";
  }

  // Filter UI elements
  const searchInput = document.getElementById("searchInput");
  const subjectFilter = document.getElementById("subjectFilter");
  const fileTypeFilter = document.getElementById("fileTypeFilter");
  const sortFilter = document.getElementById("sortFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // List elements
  const communityLoader = document.getElementById("communityLoader");
  const communityErrorMessage = document.getElementById("communityErrorMessage");
  const communityGrid = document.getElementById("communityGrid");
  const communityEmptyState = document.getElementById("communityEmptyState");
  const communityPanelSubtitle = document.getElementById("communityPanelSubtitle");

  function setLoading() {
    if (communityLoader) communityLoader.style.display = "flex";
    if (communityGrid) communityGrid.style.display = "none";
    if (communityEmptyState) communityEmptyState.style.display = "none";
    if (communityErrorMessage) communityErrorMessage.style.display = "none";
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

  function createCommunityCard(doc) {
    // Use <a> instead of div+click — correct semantics, accessible
    const card = document.createElement("a");
    card.className = "document-card";
    card.href = `document-detail.html?id=${doc.documentId}&from=community`;

    // Left Column: The Large File Type Icon
    const iconContainer = document.createElement("div");
    iconContainer.innerHTML = getFileTypeIcon(doc.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    card.appendChild(iconWrapper);

    // Right Column: The Details Column
    const content = document.createElement("div");
    content.className = "document-card-content";

    const header = document.createElement("div");
    header.className = "document-card-header";

    const title = document.createElement("h3");
    title.textContent = doc.title || doc.originalFileName || "Untitled document";
    header.appendChild(title);

    content.append(header);

    // Hide if no description
    if (doc.description) {
      const description = document.createElement("p");
      description.className = "document-description";
      description.textContent = doc.description;
      content.append(description);
    }

    const meta = document.createElement("div");
    meta.className = "document-meta";

    const dateItem = document.createElement("span");
    dateItem.className = "document-meta-item";
    dateItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatDate(doc.publishedAt)}`;
    meta.append(dateItem);

    const viewsItem = document.createElement("span");
    viewsItem.className = "document-meta-item";
    viewsItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><circle cx="12" cy="12" r="3"/></svg> ${doc.viewCount ?? 0}`;
    meta.append(viewsItem);

    const downloadsItem = document.createElement("span");
    downloadsItem.className = "document-meta-item";
    downloadsItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg> ${doc.downloadCount ?? 0}`;
    meta.append(downloadsItem);

    // Only use ownerName/displayName — do not display email
    if (doc.ownerName) {
      const ownerItem = document.createElement("span");
      ownerItem.className = "document-meta-item";
      ownerItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg> ${doc.ownerName}`;
      meta.append(ownerItem);
    }

    if (doc.subjectCode || doc.subjectName) {
      const subjectItem = document.createElement("span");
      subjectItem.className = "document-meta-item";
      const subjectText = doc.subjectCode
        ? `${doc.subjectCode} - ${doc.subjectName}`
        : doc.subjectName;
      subjectItem.title = subjectText;
      subjectItem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="vertical-align: -1px; margin-right: 4px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/></svg> ${subjectText}`;
      meta.append(subjectItem);
    }

    content.append(meta);
    card.appendChild(content);
    return card;
  }

  async function loadSubjects() {
    try {
      const result = await getPublicSubjects();
      const subjects = Array.isArray(result.data) ? result.data : [];
      const subjectDatalist = document.getElementById("subjectDatalist");
      if (subjectDatalist) {
        subjectDatalist.innerHTML = "";
        subjects.forEach(function (subject) {
          const option = document.createElement("option");
          const label = subject.subjectCode
            ? `${subject.subjectCode} - ${subject.subjectName}`
            : subject.subjectName;
          option.value = label;
          option.dataset.id = subject.subjectId;
          subjectDatalist.appendChild(option);
        });
        if (subjectFilter) subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
    } catch (error) {
      // Non-fatal: community list still works without the subject dropdown.
      console.warn("Failed to load subjects for community filter:", error);
      if (subjectFilter) subjectFilter.style.display = "none";
    }
  }

  function getSelectedSubjectId() {
    if (!subjectFilter) return "";
    const typedText = subjectFilter.value.trim();
    if (!typedText) return "";

    const subjectDatalist = document.getElementById("subjectDatalist");
    if (subjectDatalist) {
      const options = subjectDatalist.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === typedText) {
          return options[i].dataset.id || "";
        }
      }
    }
    return "";
  }

  async function loadCommunityDocuments() {
    setLoading();

    const params = {
      keyword: searchInput ? searchInput.value.trim() : "",
      subjectId: getSelectedSubjectId(),
      fileType: fileTypeFilter ? fileTypeFilter.value : "",
      sort: sortFilter ? sortFilter.value : "newest"
    };

    const isFiltering = params.keyword || params.subjectId || params.fileType;

    try {
      const result = await getPublicDocuments(params);
      const documents = Array.isArray(result.data) ? result.data : [];

      if (communityLoader) communityLoader.style.display = "none";

      if (communityPanelSubtitle) {
        communityPanelSubtitle.textContent = `${documents.length} public document${documents.length === 1 ? "" : "s"} found.`;
      }

      if (documents.length === 0) {
        if (communityGrid) communityGrid.style.display = "none";
        if (communityEmptyState) {
          communityEmptyState.style.display = "flex";
          const emptyTitle = communityEmptyState.querySelector(".empty-title");
          const emptyDesc = communityEmptyState.querySelector("p");
          if (isFiltering) {
            if (emptyTitle) emptyTitle.textContent = "No matching public documents";
            if (emptyDesc) emptyDesc.textContent = "Try changing your keyword or filters.";
          } else {
            if (emptyTitle) emptyTitle.textContent = "No public documents yet";
            if (emptyDesc) emptyDesc.textContent = "Check back later — the community library is just getting started.";
          }
        }
        return;
      }

      if (communityGrid) {
        communityGrid.innerHTML = "";
        documents.forEach(function (doc) {
          communityGrid.appendChild(createCommunityCard(doc));
        });
        communityGrid.style.display = "grid";
      }
    } catch (error) {
      if (communityLoader) communityLoader.style.display = "none";
      if (communityGrid) communityGrid.style.display = "none";
      if (communityEmptyState) communityEmptyState.style.display = "none";
      if (communityErrorMessage) {
        communityErrorMessage.textContent = error.message || "Failed to load the Community Library.";
        communityErrorMessage.style.display = "flex";
      }
    }
  }

  // Initial load
  await loadSubjects();
  await loadCommunityDocuments();

  // Bind filter events
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadCommunityDocuments, 300);
    });
  }

  if (subjectFilter) {
    subjectFilter.addEventListener("change", loadCommunityDocuments);
    subjectFilter.addEventListener("input", function () {
      const id = getSelectedSubjectId();
      if (id || subjectFilter.value === "") {
        loadCommunityDocuments();
      }
    });
    subjectFilter.addEventListener("blur", function () {
      const id = getSelectedSubjectId();
      if (!id && subjectFilter.value !== "") {
        subjectFilter.value = "";
        loadCommunityDocuments();
      }
    });
  }
  if (fileTypeFilter) fileTypeFilter.addEventListener("change", loadCommunityDocuments);
  if (sortFilter) sortFilter.addEventListener("change", loadCommunityDocuments);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", async function () {
      if (searchInput) searchInput.value = "";
      if (subjectFilter) {
        subjectFilter.value = "";
        subjectFilter.dispatchEvent(new Event("syncCustom"));
      }
      if (fileTypeFilter) {
        fileTypeFilter.value = "";
        fileTypeFilter.dispatchEvent(new Event("syncCustom"));
      }
      if (sortFilter) {
        sortFilter.value = "newest";
        sortFilter.dispatchEvent(new Event("syncCustom"));
      }
      await loadCommunityDocuments();
    });
  }
});
