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

  // Header CTA toggle
  const communityUploadBtn = document.getElementById("communityUploadBtn");
  const communityGuestActions = document.getElementById("communityGuestActions");
  if (communityUploadBtn) {
    communityUploadBtn.style.display = isAuthenticated ? "inline-flex" : "none";
  }
  if (communityGuestActions) {
    communityGuestActions.style.display = isAuthenticated ? "none" : "flex";
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

  function showFavoriteToast(message, type = "success") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    }
  }

  async function handleToggleFavorite(doc, btn) {
    btn.disabled = true;
    const wasFavorited = isDocumentFavorited(doc);
    const documentId = doc.documentId || doc.id;

    try {
      if (wasFavorited) {
        await unfavoriteDocument(documentId);
        setDocumentFavorited(doc, false);
        btn.classList.remove("favorited");
        btn.title = "Add to favorites";
        showFavoriteToast("Removed from favorites.");
      } else {
        await favoriteDocument(documentId);
        setDocumentFavorited(doc, true);
        btn.classList.add("favorited");
        btn.title = "Remove from favorites";
        showFavoriteToast("Added to favorites.");
      }
    } catch (error) {
      if (error && error.status === 401) {
        showFavoriteToast("Please log in to favorite documents.", "error");
      } else if (error && error.status === 403) {
        showFavoriteToast("You do not have access to this document.", "error");
      } else {
        showFavoriteToast(error.message || "Failed to update favorite.", "error");
      }
    } finally {
      btn.disabled = false;
    }
  }

  function createCommunityCard(doc) {
    const card = document.createElement("a");
    card.className = "document-card";
    card.href = `document-detail.html?id=${doc.documentId}&from=community`;

    // A. Header: Icon + Title
    const header = document.createElement("div");
    header.className = "comm-card-header";

    const iconContainer = document.createElement("div");
    iconContainer.innerHTML = getFileTypeIcon(doc.fileType);
    const iconWrapper = iconContainer.firstElementChild;
    if (iconWrapper) {
      iconWrapper.style.width = "20px";
      iconWrapper.style.height = "20px";
      header.appendChild(iconWrapper);
    }

    const titleEl = document.createElement("h3");
    titleEl.textContent = doc.title || doc.originalFileName || "Untitled document";
    titleEl.title = doc.title || doc.originalFileName || "Untitled document";
    header.appendChild(titleEl);

    const favoriteBtn = document.createElement("button");
    favoriteBtn.type = "button";
    const favorited = isDocumentFavorited(doc);
    favoriteBtn.className = "favorite-star-btn" + (favorited ? " favorited" : "");
    favoriteBtn.title = favorited ? "Remove from favorites" : "Add to favorites";
    favoriteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    favoriteBtn.addEventListener("click", async function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!isAuthenticated) {
        window.location.href = "login.html?redirect=community.html";
        return;
      }
      await handleToggleFavorite(doc, favoriteBtn);
    });
    header.appendChild(favoriteBtn);

    // B. Body: Avatar + Author + Subject tag badge
    const body = document.createElement("div");
    body.className = "comm-card-body";

    const authorDiv = document.createElement("div");
    authorDiv.className = "comm-card-author";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "comm-card-avatar";
    const authorName = doc.displayName || doc.ownerName || doc.uploadedByName || doc.uploadedBy || "Unknown User";
    avatarDiv.textContent = authorName.trim().charAt(0).toUpperCase();
    avatarDiv.title = authorName;

    const authorNameSpan = document.createElement("span");
    authorNameSpan.className = "comm-card-author-name";
    authorNameSpan.textContent = authorName;

    authorDiv.append(avatarDiv, authorNameSpan);
    body.appendChild(authorDiv);

    if (doc.subjectCode || doc.subjectName) {
      const subjectTag = document.createElement("div");
      subjectTag.className = "comm-card-subject-tag";
      const tagText = doc.subjectCode
        ? `${doc.subjectCode} - ${doc.subjectName}`
        : doc.subjectName;
      subjectTag.title = tagText;
      subjectTag.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01"/>
        </svg>
        <span>${tagText}</span>
      `;
      body.appendChild(subjectTag);
    }

    // C. Footer: Date & Metrics
    const footer = document.createElement("div");
    footer.className = "comm-card-footer";

    const dateSpan = document.createElement("span");
    dateSpan.className = "comm-card-date";
    dateSpan.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      ${formatDate(doc.publishedAt || doc.createdAt)}
    `;

    const metricsDiv = document.createElement("div");
    metricsDiv.className = "comm-card-metrics";

    const viewsSpan = document.createElement("span");
    viewsSpan.className = "comm-card-metric-item";
    viewsSpan.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
        <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      ${doc.viewCount ?? 0}
    `;

    const downloadsSpan = document.createElement("span");
    downloadsSpan.className = "comm-card-metric-item";
    downloadsSpan.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="12" width="12" stroke="currentColor" stroke-width="2.5">
        <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
      </svg>
      ${doc.downloadCount ?? 0}
    `;

    metricsDiv.append(viewsSpan, downloadsSpan);
    footer.append(dateSpan, metricsDiv);

    card.append(header, body, footer);
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

      const communityResultsCount = document.getElementById("communityResultsCount");
      if (communityResultsCount) {
        if (isFiltering) {
          communityResultsCount.innerHTML = `Showing <strong>${documents.length}</strong> matching public document${documents.length === 1 ? "" : "s"}.`;
        } else {
          communityResultsCount.innerHTML = `Showing <strong>${documents.length}</strong> public document${documents.length === 1 ? "" : "s"}.`;
        }
        communityResultsCount.style.display = documents.length > 0 ? "block" : "none";
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
