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

    const header = document.createElement("div");
    header.className = "document-card-header";

    const fileBadge = document.createElement("span");
    fileBadge.className = "document-type-badge";
    fileBadge.textContent = getFileLabel(doc.fileType);

    const title = document.createElement("h3");
    title.textContent = doc.title || doc.originalFileName || "Untitled document";

    header.append(fileBadge, title);
    card.append(header);

    // Hide if no description
    if (doc.description) {
      const description = document.createElement("p");
      description.className = "document-description";
      description.textContent = doc.description;
      card.append(description);
    }

    const meta = document.createElement("div");
    meta.className = "document-meta";
    meta.append(
      createMetaItem("Published", formatDate(doc.publishedAt)),
      createMetaItem("Views", doc.viewCount ?? 0),
      createMetaItem("Downloads", doc.downloadCount ?? 0)
    );

    // Only use ownerName/displayName — do not display email
    if (doc.ownerName) {
      meta.append(createMetaItem("By", doc.ownerName));
    }

    if (doc.subjectCode || doc.subjectName) {
      const subjectBadge = document.createElement("div");
      subjectBadge.className = "document-card-subject";
      subjectBadge.textContent = doc.subjectCode
        ? `${doc.subjectCode} - ${doc.subjectName}`
        : doc.subjectName;
      meta.append(subjectBadge);
    }

    card.append(meta);
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
      if (subjectFilter) subjectFilter.value = "";
      if (fileTypeFilter) fileTypeFilter.value = "";
      if (sortFilter) sortFilter.value = "newest";
      await loadCommunityDocuments();
    });
  }
});
