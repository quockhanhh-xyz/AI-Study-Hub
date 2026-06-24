// DOM refs
const uploadForm = document.getElementById("uploadForm");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const fileInput = document.getElementById("file");
const dropZone = document.getElementById("dropZone");
const dropZoneText = document.getElementById("dropZoneText");
const submitBtn = document.getElementById("submitBtn");
const uploadMessage = document.getElementById("uploadMessage");
const uploadProgress = document.getElementById("uploadProgress");
const folderSelect = document.getElementById("folderSelect");
const subjectSelect = document.getElementById("subjectSelect");
const subjectError = document.getElementById("subjectError");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// Inline "Create new subject" refs
const newSubjectRow = document.getElementById("newSubjectRow");
const newSubjectName = document.getElementById("newSubjectName");
const createSubjectBtn = document.getElementById("createSubjectBtn");
const cancelNewSubjectBtn = document.getElementById("cancelNewSubjectBtn");
const newSubjectError = document.getElementById("newSubjectError");

// Inline "Create new folder" refs
const newFolderRow = document.getElementById("newFolderRow");
const newFolderName = document.getElementById("newFolderName");
const createFolderInlineBtn = document.getElementById("createFolderInlineBtn");
const cancelNewFolderBtn = document.getElementById("cancelNewFolderBtn");
const newFolderError = document.getElementById("newFolderError");

const CREATE_NEW_VALUE = "__new__";
let lastSubjectValue = "";
let lastFolderValue = "";

// Constants
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg"
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Populates the folder select with all folder levels.
// Upload is not blocked if folder loading fails because folder selection is optional.
async function loadFolderOptions() {
  const visitedFolderIds = new Set();

  async function appendFolderOptions(parentFolderId, pathPrefix) {
    const result = await getMyFolders(parentFolderId);
    const folders = Array.isArray(result.data) ? result.data : [];

    for (const folder of folders) {
      if (visitedFolderIds.has(folder.folderId)) {
        continue;
      }

      visitedFolderIds.add(folder.folderId);

      const label = pathPrefix ? `${pathPrefix} / ${folder.folderName}` : folder.folderName;
      const option = document.createElement("option");
      option.value = folder.folderId;
      option.textContent = label;
      folderSelect.appendChild(option);

      await appendFolderOptions(folder.folderId, label);
    }
  }

  try {
    await appendFolderOptions(null, "");
  } catch (err) {
    console.warn("Could not load folders:", err);
  }

  const createOption = document.createElement("option");
  createOption.value = CREATE_NEW_VALUE;
  createOption.textContent = "+ Create new folder…";
  folderSelect.appendChild(createOption);
}

async function loadSubjectOptions() {
  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Loading subjects...";
  loadingOption.disabled = true;
  subjectSelect.appendChild(loadingOption);
  subjectSelect.disabled = true;

  try {
    const result = await getSubjects();
    const subjects = Array.isArray(result.data) ? result.data : [];

    subjectSelect.removeChild(loadingOption);
    subjects.forEach(function (subject) {
      const option = document.createElement("option");
      option.value = subject.subjectId;
      option.textContent = subject.subjectName;
      subjectSelect.appendChild(option);
    });

    const createOption = document.createElement("option");
    createOption.value = CREATE_NEW_VALUE;
    createOption.textContent = "+ Create new subject…";
    subjectSelect.appendChild(createOption);
  } catch (err) {
    console.warn("Could not load subjects:", err);
    loadingOption.textContent = "Failed to load subjects — please refresh the page";
    if (subjectError) {
      subjectError.textContent = "Could not load subjects from the server. Please refresh and try again.";
      subjectError.style.display = "block";
    }
  } finally {
    subjectSelect.disabled = false;
  }
}

// Helpers

function showMessage(text, type) {
  uploadMessage.textContent = text;
  uploadMessage.className = "upload-message status-box";
  if (type === "success") uploadMessage.classList.add("status-success");
  else if (type === "error") uploadMessage.classList.add("status-error");
  else uploadMessage.classList.add("status-checking");
  uploadMessage.style.display = "flex";
}

function hideMessage() {
  uploadMessage.style.display = "none";
  uploadMessage.className = "upload-message";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function updateDropZone(file) {
  if (file) {
    dropZoneText.innerHTML = `<strong>${file.name}</strong><br/><small>${formatFileSize(file.size)}</small>`;
    dropZone.classList.add("has-file");
  } else {
    dropZoneText.innerHTML = `Drag and drop or click to select a file<br/><small>(PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG - max 10MB)</small>`;
    dropZone.classList.remove("has-file");
  }
}

// Validation
function validateFile(file) {
  if (!file) return "Please select a file.";

  if (file.size === 0) {
    return "File is empty (0 bytes). Please select a valid file.";
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Only accepts: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG, JPEG.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is 10MB.`;
  }
  return null;
}

// Progress bar simulated because fetch has no native upload progress event.
function showProgress() {
  uploadProgress.removeAttribute("aria-hidden");
  uploadProgress.style.display = "block";
  progressFill.style.width = "0%";
  progressText.textContent = "Uploading...";

  // Increment up to 90% to simulate progress; 100% will be set upon completion
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 15;
    if (pct >= 90) {
      pct = 90;
      clearInterval(interval);
    }
    progressFill.style.width = pct + "%";
    progressText.textContent = `Uploading: ${Math.round(pct)}%`;
  }, 300);

  return interval;
}

function completeProgress(interval) {
  clearInterval(interval);
  progressFill.style.width = "100%";
  progressText.textContent = "Complete: 100%";
}

function hideProgress() {
  uploadProgress.setAttribute("aria-hidden", "true");
  uploadProgress.style.display = "none";
  progressFill.style.width = "0%";
}

// File input change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0] || null;
  updateDropZone(file);
  hideMessage();
});

// Keyboard accessibility for drop zone
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

// Drag and drop
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (e) => {
  // Only remove class when actually leaving the drop-zone (not moving into a child element)
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove("drag-over");
  }
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    updateDropZone(file);
    hideMessage();
  }
});

// Error message resolver
function resolveUploadError(err) {
  const msg = (err.message || "").toLowerCase();
  const isDuplicate =
    msg.includes("409") ||
    msg.includes("duplicate") ||
    msg.includes("already exists") ||
    msg.includes("file already");

  if (isDuplicate) {
    return "This file already exists in the current folder. Please rename the file, choose a different folder, or upload a different file.";
  }
  return err.message || "Upload failed. Please try again.";
}

/* ==========================================================================
   STEP 6D: INLINE "CREATE NEW SUBJECT" / "CREATE NEW FOLDER" UX
   ========================================================================== */

function showRowError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

// Subject: toggle inline row when "+ Create new subject…" is chosen.
subjectSelect.addEventListener("change", () => {
  if (subjectSelect.value === CREATE_NEW_VALUE) {
    newSubjectRow.style.display = "flex";
    showRowError(newSubjectError, "");
    newSubjectName.value = "";
    newSubjectName.focus();
  } else {
    newSubjectRow.style.display = "none";
    lastSubjectValue = subjectSelect.value;
    subjectError.style.display = "none";
  }
});

cancelNewSubjectBtn.addEventListener("click", () => {
  newSubjectRow.style.display = "none";
  showRowError(newSubjectError, "");
  subjectSelect.value = lastSubjectValue;
});

async function handleCreateSubject() {
  const name = newSubjectName.value.trim();
  if (!name) {
    showRowError(newSubjectError, "Subject name is required.");
    newSubjectName.focus();
    return;
  }

  createSubjectBtn.disabled = true;
  showRowError(newSubjectError, "");

  try {
    const result = await createSubject({ subjectName: name });
    const created = result && result.data ? result.data : null;
    if (!created || !created.subjectId) {
      throw new Error("Unexpected response while creating the subject.");
    }

    const option = document.createElement("option");
    option.value = created.subjectId;
    option.textContent = created.subjectName || name;
    subjectSelect.insertBefore(option, subjectSelect.querySelector(`option[value="${CREATE_NEW_VALUE}"]`));
    subjectSelect.value = created.subjectId;
    lastSubjectValue = String(created.subjectId);

    newSubjectRow.style.display = "none";
    subjectError.style.display = "none";
    window.showToast(`Subject "${option.textContent}" created and selected.`, "success");
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    const isDuplicate = msg.includes("409") || msg.includes("duplicate") || msg.includes("already exists");
    showRowError(
      newSubjectError,
      isDuplicate ? "A subject with this name already exists. Please choose it from the list instead." : (err.message || "Failed to create subject.")
    );
  } finally {
    createSubjectBtn.disabled = false;
  }
}

createSubjectBtn.addEventListener("click", handleCreateSubject);
newSubjectName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleCreateSubject();
  }
});

// Folder: toggle inline row when "+ Create new folder…" is chosen.
folderSelect.addEventListener("change", () => {
  if (folderSelect.value === CREATE_NEW_VALUE) {
    newFolderRow.style.display = "flex";
    showRowError(newFolderError, "");
    newFolderName.value = "";
    newFolderName.focus();
  } else {
    newFolderRow.style.display = "none";
    lastFolderValue = folderSelect.value;
  }
});

cancelNewFolderBtn.addEventListener("click", () => {
  newFolderRow.style.display = "none";
  showRowError(newFolderError, "");
  folderSelect.value = lastFolderValue;
});

async function handleCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) {
    showRowError(newFolderError, "Folder name is required.");
    newFolderName.focus();
    return;
  }

  createFolderInlineBtn.disabled = true;
  showRowError(newFolderError, "");

  try {
    const result = await createFolder({ folderName: name, parentFolderId: null });
    const created = result && result.data ? result.data : null;
    if (!created || !created.folderId) {
      throw new Error("Unexpected response while creating the folder.");
    }

    const option = document.createElement("option");
    option.value = created.folderId;
    option.textContent = created.folderName || name;
    folderSelect.insertBefore(option, folderSelect.querySelector(`option[value="${CREATE_NEW_VALUE}"]`));
    folderSelect.value = created.folderId;
    lastFolderValue = String(created.folderId);

    newFolderRow.style.display = "none";
    window.showToast(`Folder "${option.textContent}" created and selected.`, "success");
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    const isDuplicate = msg.includes("409") || msg.includes("duplicate") || msg.includes("already exists");
    showRowError(
      newFolderError,
      isDuplicate ? "A folder with this name already exists here. Please choose it from the list instead." : (err.message || "Failed to create folder.")
    );
  } finally {
    createFolderInlineBtn.disabled = false;
  }
}

createFolderInlineBtn.addEventListener("click", handleCreateFolder);
newFolderName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleCreateFolder();
  }
});

// Form submit
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();
  hideProgress();

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const file = fileInput.files[0] || null;

  if (!title) {
    showMessage("Title is required.", "error");
    titleInput.focus();
    return;
  }

  const subjectId = subjectSelect.value;

  if (subjectId === CREATE_NEW_VALUE) {
    showRowError(newSubjectError, "Please create the subject first, or pick an existing one from the list.");
    newSubjectName.focus();
    return;
  }

  if (!subjectId) {
    subjectError.textContent = "Please select a subject.";
    subjectError.style.display = "block";
    subjectSelect.focus();
    return;
  }
  subjectError.style.display = "none";

  const folderId = folderSelect.value;
  if (folderId === CREATE_NEW_VALUE) {
    showRowError(newFolderError, "Please create the folder first, or pick an existing one from the list.");
    newFolderName.focus();
    return;
  }

  const fileError = validateFile(file);
  if (fileError) {
    showMessage(fileError, "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);
  if (folderId) formData.append("folderId", folderId);
  formData.append("subjectId", subjectId);

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";
  const progressInterval = showProgress();

  try {
    const result = await uploadDocument(formData);
    completeProgress(progressInterval);
    window.showToast(`Upload successful: "${result.data.title}"`, "success");
    uploadForm.reset();
    updateDropZone(null);
    newSubjectRow.style.display = "none";
    newFolderRow.style.display = "none";
    setTimeout(() => { window.location.href = "documents.html"; }, 1500);

  } catch (err) {
    clearInterval(progressInterval);
    hideProgress();
    showMessage(resolveUploadError(err), "error");

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload Document";
  }
});

loadFolderOptions();
loadSubjectOptions();
