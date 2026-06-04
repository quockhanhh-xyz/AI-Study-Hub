document.addEventListener("DOMContentLoaded", async function () {
  const userNameElement = document.getElementById("dashboardUserName");
  const currentUserRaw = localStorage.getItem("currentUser");

  if (!currentUserRaw) {
    window.location.href = "login.html";
    return;
  }

  let currentUser;
  try {
    currentUser = JSON.parse(currentUserRaw);
    if (userNameElement) {
      userNameElement.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
    }
  } catch (error) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  const docCountElement = document.getElementById("docCount");
  const chatCountElement = document.getElementById("chatCount");
  const joinDateElement = document.getElementById("joinDate");
  const documentLoader = document.getElementById("documentLoader");
  const documentErrorMessage = document.getElementById("documentErrorMessage");
  const documentGrid = document.getElementById("documentGrid");
  const emptyState = document.getElementById("emptyState");

  if (chatCountElement) chatCountElement.textContent = "0";
  if (joinDateElement) joinDateElement.textContent = currentUser.tier || "FREE";

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
    title.textContent = documentItem.title || documentItem.originalFileName || "Untitled document";

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

    const actions = document.createElement("div");
    actions.className = "document-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn btn-secondary document-open-btn";
    openButton.textContent = "Open File";
    openButton.disabled = !documentItem.fileUrl;
    openButton.addEventListener("click", function () {
      if (documentItem.fileUrl) {
        window.open(documentItem.fileUrl, "_blank", "noopener");
      }
    });

    actions.append(openButton);
    card.append(header, description, meta, actions);

    return card;
  }

  async function loadDocuments() {
    setDocumentsLoading();

    try {
      const result = await getMyDocuments();
      const documents = Array.isArray(result.data) ? result.data : [];

      if (docCountElement) docCountElement.textContent = String(documents.length);
      if (documentLoader) documentLoader.style.display = "none";

      if (documents.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (documentGrid) {
        documentGrid.innerHTML = "";
        documents.forEach(function (documentItem) {
          documentGrid.appendChild(createDocumentCard(documentItem));
        });
        documentGrid.style.display = "grid";
      }
    } catch (error) {
      if (docCountElement) docCountElement.textContent = "0";
      if (documentLoader) documentLoader.style.display = "none";
      if (documentErrorMessage) {
        documentErrorMessage.textContent = error.message || "Failed to load documents.";
        documentErrorMessage.style.display = "flex";
      }
    }
  }

  await loadDocuments();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("accessToken");
      window.location.href = "login.html";
    });
  }
});
