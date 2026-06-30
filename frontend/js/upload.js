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
const newSubjectCode = document.getElementById("newSubjectCode");
const newSubjectName = document.getElementById("newSubjectName");
const newSubjectError = document.getElementById("newSubjectError");

// Inline "Create new folder" refs
const newFolderRow = document.getElementById("newFolderRow");
const newFolderName = document.getElementById("newFolderName");
const newFolderError = document.getElementById("newFolderError");

const CREATE_NEW_VALUE = "__new__";
let lastSubjectValue = "";
let lastFolderValue = "";
let uploadAbortController = null;

function getSelectedSubjectId() {
  if (!subjectSelect) return "";
  const typedText = subjectSelect.value.trim();
  if (!typedText) return "";

  const subjectDatalist = document.getElementById("subjectDatalist");
  if (subjectDatalist) {
    const options = subjectDatalist.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === typedText || options[i].dataset.id === typedText) {
        return options[i].dataset.id || "";
      }
    }
  }
  return "";
}

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

  // Auto-select folder if folderId is provided in URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedFolderId = urlParams.get("folderId") || urlParams.get("parentFolderId");
  if (preselectedFolderId) {
    folderSelect.value = preselectedFolderId;
    lastFolderValue = preselectedFolderId;
  }

  // Initialize the custom dropdown component
  if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
    window.UIHelper.convertSelectToCustomDropdown(folderSelect);
  }
}

async function loadSubjectOptions() {
  const subjectDatalist = document.getElementById("subjectDatalist");
  if (!subjectDatalist) return;

  subjectSelect.placeholder = "Loading subjects...";
  subjectSelect.disabled = true;

  try {
    const result = await getSubjects();
    const subjects = Array.isArray(result.data) ? result.data : [];

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

    const createOption = document.createElement("option");
    createOption.value = CREATE_NEW_VALUE;
    createOption.textContent = "+ Create new subject…";
    subjectDatalist.appendChild(createOption);

    subjectSelect.placeholder = "-- Select a subject --";
  } catch (err) {
    console.warn("Could not load subjects:", err);
    subjectSelect.placeholder = "Failed to load subjects — please refresh";
    if (subjectError) {
      subjectError.textContent = "Could not load subjects from the server. Please refresh and try again.";
      subjectError.style.display = "block";
    }
  } finally {
    subjectSelect.disabled = false;
    // Initialize the custom dropdown component
    if (window.UIHelper && window.UIHelper.convertInputToCustomDropdown) {
      window.UIHelper.convertInputToCustomDropdown(subjectSelect);
    }
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
  const contentContainer = document.getElementById("dropZoneContent");
  if (!contentContainer) return;

  if (file) {
    contentContainer.innerHTML = "";

    const card = document.createElement("div");
    card.className = "file-preview-card";
    
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "file-preview-icon";
    const ext = file.name.split('.').pop() || '';
    if (window.getFileTypeIcon) {
      iconWrapper.innerHTML = window.getFileTypeIcon(ext);
    }
    
    const details = document.createElement("div");
    details.className = "file-preview-details";
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "file-preview-name";
    nameSpan.textContent = file.name;
    
    const sizeSpan = document.createElement("span");
    sizeSpan.className = "file-preview-size";
    sizeSpan.textContent = formatFileSize(file.size);
    
    details.append(nameSpan, sizeSpan);
    
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "file-preview-remove";
    removeBtn.id = "removeFileBtn";
    removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    
    removeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      fileInput.value = "";
      updateDropZone(null);
      hideMessage();
    });
    
    card.append(iconWrapper, details, removeBtn);
    contentContainer.appendChild(card);
    
    dropZone.style.padding = "12px";
    dropZone.classList.add("has-file");
  } else {
    dropZone.style.padding = "";
    dropZone.classList.remove("has-file");
    contentContainer.innerHTML = `
        <div class="drop-zone-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                id="Folder--Streamline-Guidance-Free" height="32" width="32" aria-hidden="true"
                focusable="false">
                <desc>Folder Streamline Icon: https://streamlinehq.com</desc>
                <path stroke="currentColor"
                    d="M1.5 10V2.5h5l3 3h11v3m3 0.25V8.5H4.6l-0.15 0.25 -0.234 0.492A28 28 0 0 0 1.5 21.272v0.228h19v-0.128a28 28 0 0 1 2.757 -12.116l0.243 -0.506Z"
                    stroke-width="1"></path>
            </svg>
        </div>
        <span class="drop-zone-text" id="dropZoneText">
            Drag & drop or click to select a file<br />
            <small>(PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG — max 10MB)</small>
        </span>
    `;
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
  const isCreateNew = subjectSelect.value === CREATE_NEW_VALUE || 
                       subjectSelect.value === "+ Create new subject…";
  if (isCreateNew) {
    newSubjectRow.style.display = "flex";
    showRowError(newSubjectError, "");
    newSubjectCode.value = "";
    newSubjectName.value = "";
    newSubjectCode.focus();
    subjectSelect.value = "";
    subjectSelect.dispatchEvent(new Event("syncCustom"));
  } else {
    newSubjectRow.style.display = "none";
    lastSubjectValue = subjectSelect.value;
    subjectError.style.display = "none";
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

  // 1. Check if we need to create a new Subject
  const isCreatingSubject = (newSubjectRow.style.display === "flex");
  let subjectCodeVal = "";
  let subjectNameVal = "";
  if (isCreatingSubject) {
    subjectCodeVal = newSubjectCode.value.trim();
    subjectNameVal = newSubjectName.value.trim();
    if (!subjectCodeVal) {
      showRowError(newSubjectError, "Subject code is required.");
      newSubjectCode.focus();
      return;
    }
    if (!subjectNameVal) {
      showRowError(newSubjectError, "Subject name is required.");
      newSubjectName.focus();
      return;
    }
    showRowError(newSubjectError, "");
  }

  let subjectId = "";
  if (!isCreatingSubject) {
    subjectId = getSelectedSubjectId();
    if (!subjectId) {
      subjectError.textContent = "Please select a valid subject from the list or create a new one.";
      subjectError.style.display = "block";
      subjectSelect.focus();
      return;
    }
    subjectError.style.display = "none";
  }

  // 2. Check if we need to create a new Folder
  const isCreatingFolder = (newFolderRow.style.display === "flex");
  let folderNameVal = "";
  if (isCreatingFolder) {
    folderNameVal = newFolderName.value.trim();
    if (!folderNameVal) {
      showRowError(newFolderError, "Folder name is required.");
      newFolderName.focus();
      return;
    }
    showRowError(newFolderError, "");
  }

  let folderId = "";
  if (!isCreatingFolder) {
    folderId = folderSelect.value;
    if (folderId === CREATE_NEW_VALUE) {
      showRowError(newFolderError, "Please pick an existing folder or enter a folder name to create.");
      newFolderName.focus();
      return;
    }
  }

  const fileError = validateFile(file);
  if (fileError) {
    showMessage(fileError, "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";
  
  // Setup AbortController
  uploadAbortController = new AbortController();
  const signal = uploadAbortController.signal;
  
  const progressInterval = showProgress();

  // Setup Cancel button listener
  const cancelUploadBtn = document.getElementById("cancelUploadBtn");
  let onCancel = null;
  if (cancelUploadBtn) {
    onCancel = () => {
      if (uploadAbortController) {
        uploadAbortController.abort();
      }
    };
    cancelUploadBtn.addEventListener("click", onCancel);
  }

  try {
    // Step 2.2: Create Subject dynamically if requested
    if (isCreatingSubject) {
      try {
        const payload = { subjectCode: subjectCodeVal, subjectName: subjectNameVal };
        const resultSub = await createSubject(payload);
        subjectId = resultSub.data.subjectId;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const isDuplicate = msg.includes("409") || msg.includes("duplicate") || msg.includes("already exists");
        showRowError(
          newSubjectError,
          isDuplicate ? "A subject with this code or name already exists." : (err.message || "Failed to create subject.")
        );
        throw err;
      }
    }

    // Step 2.3: Create Folder dynamically if requested
    if (isCreatingFolder) {
      try {
        const resultFolder = await createFolder({ folderName: folderNameVal, parentFolderId: null });
        folderId = resultFolder.data.folderId;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        const isDuplicate = msg.includes("409") || msg.includes("duplicate") || msg.includes("already exists");
        showRowError(
          newFolderError,
          isDuplicate ? "A folder with this name already exists here." : (err.message || "Failed to create folder.")
        );
        throw err;
      }
    }

    // Step 2.4: Upload document with new or preselected IDs
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (description) formData.append("description", description);
    if (folderId) formData.append("folderId", folderId);
    formData.append("subjectId", subjectId);

    const result = await uploadDocument(formData, { signal });
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
    
    if (err.name === "AbortError" || (err.message && err.message.includes("aborted"))) {
      showMessage("Upload cancelled by user.", "warning");
      return;
    }
    
    showMessage(resolveUploadError(err), "error");

  } finally {
    if (cancelUploadBtn && onCancel) {
      cancelUploadBtn.removeEventListener("click", onCancel);
    }
    uploadAbortController = null;
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload Document";
  }
});

loadFolderOptions();
loadSubjectOptions();
