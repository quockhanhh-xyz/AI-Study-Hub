// ── DOM refs ──────────────────────────────────────────────────────────────────
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
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Load folders into dropdown ────────────────────────────────────────────
async function loadFolderOptions() {
  try {
    const result = await getMyFolders();
    const folders = Array.isArray(result.data) ? result.data : [];

    folders.forEach(function (folder) {
      const option = document.createElement("option");
      option.value = folder.folderId;
      option.textContent = folder.name;
      folderSelect.appendChild(option);
    });

  } catch (err) {
    // Folder dropdown is optional, so upload should not be blocked if loading folders fails.
    console.warn("Could not load folders:", err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showMessage(text, type) {
  uploadMessage.textContent = text;
  uploadMessage.className = "status-box";
  if (type === "success") uploadMessage.classList.add("status-success");
  else if (type === "error") uploadMessage.classList.add("status-error");
  else uploadMessage.classList.add("status-checking");
  uploadMessage.style.display = "flex";
}

function hideMessage() {
  uploadMessage.style.display = "none";
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

// ── Validation ────────────────────────────────────────────────────────────────
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

// ── Progress bar (Simulated since fetch lacks a native progress event) ─────────
function showProgress() {
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
  uploadProgress.style.display = "none";
  progressFill.style.width = "0%";
}

// ── File input change ─────────────────────────────────────────────────────────
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0] || null;
  updateDropZone(file);
  hideMessage();
});

// ── Keyboard accessibility for drop zone ─────────────────────────────────────
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

// ── Drag and Drop ─────────────────────────────────────────────────────────────
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

// ── Form submit ───────────────────────────────────────────────────────────────
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage();
  hideProgress();

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const file = fileInput.files[0] || null;

  // Client-side validation
  if (!title) {
    showMessage("Title is required.", "error");
    titleInput.focus();
    return;
  }

  const fileError = validateFile(file);
  if (fileError) {
    showMessage(fileError, "error");
    return;
  }

  // Build FormData - do not set Content-Type, let the browser handle it
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);
  if (folderSelect.value) formData.append("folderId", folderSelect.value);

  // Loading state
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";
  const progressInterval = showProgress();

  try {
    const result = await uploadDocument(formData);
    completeProgress(progressInterval);
    showMessage(`Upload successful: "${result.data.title}"`, "success");

    // Reset form
    uploadForm.reset();
    updateDropZone(null);

    // Redirect to dashboard after 1.5 seconds
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (err) {
    clearInterval(progressInterval);
    hideProgress();
    showMessage(err.message, "error");

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload document";
  }
});

loadFolderOptions();