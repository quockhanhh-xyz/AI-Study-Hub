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
const schoolSelect = document.getElementById("schoolSelect");
const majorSelect = document.getElementById("majorSelect");
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

// Inline buttons
const inlineCreateSubjectBtn = document.getElementById("inlineCreateSubjectBtn");
const inlineCreateFolderBtn = document.getElementById("inlineCreateFolderBtn");

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
// Step 13: fallback only while entitlements are loading; real limit comes from
// getAccountEntitlements().limits.maxFileSizeBytes via loadUploadLimits() below.
let maxFileSizeBytes = 10 * 1024 * 1024;

async function loadUploadLimits() {
  try {
    const res = await getAccountEntitlements();
    const entitlements = res.data || res;
    if (entitlements.limits && typeof entitlements.limits.maxFileSizeBytes === "number") {
      maxFileSizeBytes = entitlements.limits.maxFileSizeBytes;
    }
  } catch (err) {
    console.warn("Could not load account entitlements, using default file size limit:", err);
  } finally {
    // Re-render the drop-zone hint text with the real limit, but only if no
    // file is currently selected (so we don't overwrite an active file preview).
    if (!fileInput.files || fileInput.files.length === 0) {
      updateDropZone(null);
    }
  }
}

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
  const folderNameParam = urlParams.get("folderName");
  const uploadBackLink = document.getElementById("uploadBackLink");
  const uploadContextBanner = document.getElementById("uploadContextBanner");

  if (preselectedFolderId) {
    folderSelect.value = preselectedFolderId;
    lastFolderValue = preselectedFolderId;
    folderSelect.disabled = true; // Lock folder selection

    if (uploadContextBanner) {
        uploadContextBanner.textContent = folderNameParam ? `Uploading to ${folderNameParam}` : "Uploading to Folder";
    }
    if (uploadBackLink) {
        uploadBackLink.href = `folders.html?folderId=${preselectedFolderId}`;
        uploadBackLink.textContent = folderNameParam ? `← ${folderNameParam}` : "← Back to Folder";
    }
  } else {
    if (uploadContextBanner) {
        uploadContextBanner.textContent = "Uploading to My Documents";
    }
    if (uploadBackLink) {
        uploadBackLink.href = "documents.html";
        uploadBackLink.textContent = "← Back to My Documents";
    }
  }

  // Initialize the custom dropdown component
  if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
    window.UIHelper.convertSelectToCustomDropdown(folderSelect);
  }
}

async function loadSubjectOptions(majorId = "") {
  const subjectDatalist = document.getElementById("subjectDatalist");
  if (!subjectDatalist) return;

  subjectSelect.placeholder = "Loading subjects...";
  subjectSelect.disabled = true;

  try {
    const result = await getSubjects("");
    const subjects = Array.isArray(result.data) ? result.data : [];

    subjectDatalist.innerHTML = "";

    const createOption = document.createElement("option");
    createOption.value = CREATE_NEW_VALUE;
    createOption.textContent = "+ Create new subject…";
    subjectDatalist.appendChild(createOption);

    subjects.forEach(function (subject) {
      const option = document.createElement("option");
      const label = subject.subjectCode
        ? `${subject.subjectCode} - ${subject.subjectName}`
        : subject.subjectName;
      option.value = label;
      option.dataset.id = subject.subjectId;
      subjectDatalist.appendChild(option);
    });

    subjectSelect.value = "";
    subjectSelect.dispatchEvent(new Event("syncCustom"));
    subjectSelect.placeholder = "Select a subject";
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
            Select one file to upload<br />
            <small>(PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG — max ${formatFileSize(maxFileSizeBytes)})</small>
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
  if (file.size > maxFileSizeBytes) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(maxFileSizeBytes)}.`;
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

let lastAutofilledTitle = "";

// Auto-fill Title from the selected file's name, but only if the user
// hasn't already typed something into the Title field themselves.
function autofillTitleFromFile(file) {
  if (!file || !titleInput) return;
  const currentTitle = titleInput.value.trim();
  if (currentTitle && currentTitle !== lastAutofilledTitle) return;
  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
  titleInput.value = nameWithoutExt;
  lastAutofilledTitle = nameWithoutExt;
}

// File input change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0] || null;
  updateDropZone(file);
  autofillTitleFromFile(file);
  hideMessage();
  checkFormValidity();
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
    autofillTitleFromFile(file);
    hideMessage();
  }
});

// Error message resolver
function resolveUploadError(err) {
  if (err.status === 409) {
    return "This file already exists in the current folder. Please rename the file, choose a different folder, or upload a different file.";
  }
  if (err.status === 500) {
    return "Something went wrong on the server while processing your file. Please try again in a moment.";
  }
  const msg = err.message || "";
  if (msg.length > 150 || /SQL|Duplicate entry|constraint/i.test(msg)) {
    return "Upload failed due to a server error. Please try again or contact support if it persists.";
  }
  return msg || "Upload failed. Please try again.";
}

// Step 13: detects backend quota errors (storage/document/file-size limits)
// so we can route them through the shared showQuotaError() helper instead
// of the generic upload error resolver above.
function isQuotaError(err) {
  return !!(err && typeof err.code === "string" && /LIMIT_EXCEEDED|QUOTA_EXCEEDED/.test(err.code));
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
    if (newSubjectRow.style.display !== "flex") {
      newSubjectRow.style.display = "flex";
      showRowError(newSubjectError, "");
      newSubjectCode.value = "";
      newSubjectName.value = "";
      newSubjectCode.focus();
    }
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
  checkFormValidity();
});

const triggerCreateSubjectBtn = document.getElementById("triggerCreateSubjectBtn");
if (triggerCreateSubjectBtn) {
    triggerCreateSubjectBtn.addEventListener("click", (e) => {
        e.preventDefault();
        subjectSelect.value = CREATE_NEW_VALUE;
        subjectSelect.dispatchEvent(new Event("change"));
        if (window.UIHelper && window.UIHelper.convertInputToCustomDropdown) {
             // Force UI dropdown sync if needed, though native change might handle it
        }
    });
}

if (inlineCreateSubjectBtn) {
    inlineCreateSubjectBtn.addEventListener("click", async () => {
        const code = newSubjectCode.value.trim();
        const name = newSubjectName.value.trim();
        if (!code || !name) {
            showRowError(newSubjectError, "Subject code and name are required.");
            return;
        }

        inlineCreateSubjectBtn.disabled = true;
        inlineCreateSubjectBtn.textContent = "Creating...";
        showRowError(newSubjectError, "");

        try {
            const resultSub = await createSubject({ subjectCode: code, subjectName: name });
            const newId = resultSub.data.subjectId;
            const newLabel = `${code} - ${name}`;

            // Add to select
            const opt = document.createElement("option");
            opt.value = newLabel;
            opt.dataset.id = newId;
            opt.textContent = newLabel;

            const datalist = document.getElementById("subjectDatalist");
            if (datalist) datalist.appendChild(opt);

            subjectSelect.value = newLabel;

            newSubjectRow.style.display = "none";
            window.showToast("Subject created successfully!", "success");
            subjectSelect.dispatchEvent(new Event("syncCustom"));
            checkFormValidity();
        } catch (err) {
            const isDuplicate = err.status === 409;
            showRowError(
              newSubjectError,
              isDuplicate ? "A subject with this code or name already exists." : (err.message || "Failed to create subject.")
            );
        } finally {
            inlineCreateSubjectBtn.disabled = false;
            inlineCreateSubjectBtn.textContent = "Create";
        }
    });
}

if (inlineCreateFolderBtn) {
    inlineCreateFolderBtn.addEventListener("click", async () => {
        const name = newFolderName.value.trim();
        if (!name) {
            showRowError(newFolderError, "Folder name is required.");
            return;
        }

        inlineCreateFolderBtn.disabled = true;
        inlineCreateFolderBtn.textContent = "Creating...";
        showRowError(newFolderError, "");

        try {
            const resultFolder = await createFolder({ folderName: name, parentFolderId: null });
            const newId = resultFolder.data.folderId;

            const opt = document.createElement("option");
            opt.value = newId;
            opt.textContent = name;

            folderSelect.appendChild(opt);
            folderSelect.value = newId;

            newFolderRow.style.display = "none";
            window.showToast("Folder created successfully!", "success");
            folderSelect.dispatchEvent(new Event("syncCustom"));
            checkFormValidity();
        } catch (err) {
            const isDuplicate = err.status === 409;
            showRowError(
              newFolderError,
              isDuplicate ? "A folder with this name already exists here." : (err.message || "Failed to create folder.")
            );
        } finally {
            inlineCreateFolderBtn.disabled = false;
            inlineCreateFolderBtn.textContent = "Create";
        }
    });
}

function checkFormValidity() {
    const title = titleInput.value.trim();
    const hasFile = fileInput.files && fileInput.files.length > 0;

    const isCreatingSubject = (newSubjectRow.style.display === "flex");
    let hasSubject = false;
    if (isCreatingSubject) {
        hasSubject = newSubjectCode.value.trim() !== "" && newSubjectName.value.trim() !== "";
    } else {
        hasSubject = subjectSelect.value.trim() !== "";
    }

    if (title && hasFile && hasSubject) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

titleInput.addEventListener("input", checkFormValidity);
subjectSelect.addEventListener("input", checkFormValidity);
subjectSelect.addEventListener("change", checkFormValidity);
newSubjectCode.addEventListener("input", checkFormValidity);
newSubjectName.addEventListener("input", checkFormValidity);

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

  const selectedSchoolId = schoolSelect ? schoolSelect.value : "";
  const selectedMajorId = majorSelect ? majorSelect.value : "";
  if (!selectedSchoolId || !selectedMajorId) {
    showMessage("School and major are required.", "error");
    return;
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
        const isDuplicate = err.status === 409;
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
        const isDuplicate = err.status === 409;
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

    const schId = selectedSchoolId;
    const majId = selectedMajorId;
    if (schId) formData.append("schoolId", schId);
    if (majId) formData.append("majorId", majId);

    const result = await uploadDocument(formData, { signal });
    completeProgress(progressInterval);
    window.showToast(`Upload successful: "${result.data.title}"`, "success");
    uploadForm.reset();
    if (typeof loadSchoolAndMajorOptions === "function") {
      loadSchoolAndMajorOptions();
    }
    updateDropZone(null);
    newSubjectRow.style.display = "none";
    newFolderRow.style.display = "none";
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get("source");
      const fId = urlParams.get("folderId");
      if (source === "folder" && fId) {
        window.location.href = `folders.html?folderId=${fId}`;
      } else if (source === "community") {
        window.location.href = "community.html";
      } else {
        window.location.href = "documents.html";
      }
    }, 1500);

  } catch (err) {
    clearInterval(progressInterval);
    hideProgress();

    if (err.name === "AbortError" || (err.message && err.message.includes("aborted"))) {
      showMessage("Upload cancelled by user.", "warning");
      return;
    }

    // Step 13: quota errors (storage/document/file-size limit exceeded) get the
    // shared quota toast + a matching inline message, instead of the generic resolver.
    if (isQuotaError(err) && typeof window.showQuotaError === "function") {
      window.showQuotaError(err);
      const quotaMessage = typeof window.getQuotaErrorMessage === "function"
        ? window.getQuotaErrorMessage(err)
        : resolveUploadError(err);
      showMessage(quotaMessage, "error");
    } else {
      showMessage(resolveUploadError(err), "error");
    }

  } finally {
    if (cancelUploadBtn && onCancel) {
      cancelUploadBtn.removeEventListener("click", onCancel);
    }
    uploadAbortController = null;
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload Document";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get("source");
  const folderId = urlParams.get("folderId");
  const folderName = urlParams.get("folderName");

  const backLink = document.querySelector(".btn-back");
  if (backLink) {
    if (source === "folder" && folderId) {
      backLink.href = `folders.html?folderId=${folderId}`;
      backLink.textContent = `← Back to ${folderName || "Folder"}`;
    } else if (source === "community") {
      backLink.href = "community.html";
      backLink.textContent = "← Back to Community Library";
    } else {
      backLink.href = "documents.html";
      backLink.textContent = "← Back to My Documents";
    }
  }

  // Folder auto-fill notice context
  if (folderName && (folderId || urlParams.get("parentFolderId"))) {
    const pageHeader = document.querySelector(".page-header");
    if (pageHeader) {
      const h1 = pageHeader.querySelector("h1");
      const p = pageHeader.querySelector("p");
      if (h1) h1.textContent = `Uploading to ${folderName}`;
      if (p) p.textContent = `Uploading your study document into "${folderName}".`;
    }

    const folderFormGroup = document.querySelector("#folderSelect")?.closest(".form-group");
    if (folderFormGroup) {
      let notice = document.getElementById("folderUploadNotice");
      if (!notice) {
        notice = document.createElement("div");
        notice.id = "folderUploadNotice";
        notice.style.cssText = "font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 6px; display: flex; align-items: center; gap: 6px;";
        folderFormGroup.appendChild(notice);
      }
      notice.innerHTML = `<span>📂 Target Folder:</span> <strong>${folderName}</strong>`;
    }
  }

  async function loadSchoolAndMajorOptions() {
    if (!schoolSelect || !majorSelect) return;

    try {
      // 1. Load Schools
      const schoolRes = await getActiveSchools();
      if (schoolRes && schoolRes.success) {
        schoolSelect.innerHTML = '<option value="">Select School</option>';
        schoolRes.data.forEach(sch => {
          const opt = document.createElement("option");
          opt.value = sch.schoolId;
          opt.textContent = `${sch.schoolName} (${sch.shortName})`;
          schoolSelect.appendChild(opt);
        });
        
        if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
          window.UIHelper.convertSelectToCustomDropdown(schoolSelect);
          schoolSelect.dispatchEvent(new Event("syncCustom"));
        }
      }

      // 2. Fetch User Profile to get default School and Major
      const profileRes = await getProfile();
      if (profileRes && profileRes.data) {
        const profile = profileRes.data;
        if (profile.schoolId) {
          schoolSelect.value = profile.schoolId;

          // Load majors for this school
          const majorRes = await getActiveMajors(profile.schoolId);
          if (majorRes && majorRes.success) {
            populateUploadMajors(majorRes.data);
            if (profile.majorId) {
              majorSelect.value = profile.majorId;
              await loadSubjectOptions(profile.majorId);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to initialize School/Major selections in upload:", err);
    }
  }

  function populateUploadMajors(majors) {
    if (!majorSelect) return;
    majorSelect.innerHTML = '<option value="">Select Major</option>';
    if (majors && majors.length > 0) {
      majors.forEach(maj => {
        const opt = document.createElement("option");
        opt.value = maj.majorId;
        opt.textContent = `${maj.majorName} (${maj.majorCode})`;
        majorSelect.appendChild(opt);
      });
      majorSelect.disabled = false;
    } else {
      majorSelect.disabled = true;
    }

    if (window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
      window.UIHelper.convertSelectToCustomDropdown(majorSelect);
      majorSelect.dispatchEvent(new Event("syncCustom"));
    }
  }

  // School Select change listener in upload page
  if (schoolSelect) {
    schoolSelect.addEventListener("change", async () => {
      const schoolId = schoolSelect.value;
      subjectSelect.value = "";
      subjectSelect.dispatchEvent(new Event("syncCustom"));
      if (schoolId) {
        try {
          const res = await getActiveMajors(schoolId);
          if (res && res.success) {
            populateUploadMajors(res.data);
          }
        } catch (err) {
          console.error("Failed to load majors:", err);
        }
      } else {
        majorSelect.innerHTML = '<option value="">Select Major</option>';
        majorSelect.disabled = true;
        await loadSubjectOptions();
      }
    });
  }

  if (majorSelect) {
    majorSelect.addEventListener("change", async () => {
      await loadSubjectOptions(majorSelect.value);
    });
  }

  // ── Subject Request Modal Bindings ──
  const openReqLink = document.getElementById("openSubjectReqLink");
  const reqModal = document.getElementById("subjectReqModal");
  const cancelReqBtn = document.getElementById("cancelSubjectReqBtn");
  const submitReqBtn = document.getElementById("submitSubjectReqBtn");
  const reqCodeInput = document.getElementById("reqSubjectCode");
  const reqNameInput = document.getElementById("reqSubjectName");
  const reqDescInput = document.getElementById("reqSubjectDesc");
  const reqMsg = document.getElementById("reqSubjectMsg");

  function openReqModal() {
    if (!reqModal) return;
    const schoolId = schoolSelect ? schoolSelect.value : "";
    const majorId = majorSelect ? majorSelect.value : "";
    if (!schoolId || !majorId) {
      if (window.showToast) {
        window.showToast("Select a school and major before requesting a system subject.", "error");
      }
      return;
    }
    if (reqCodeInput) reqCodeInput.value = "";
    if (reqNameInput) reqNameInput.value = "";
    if (reqDescInput) reqDescInput.value = "";
    if (reqMsg) {
      reqMsg.style.display = "none";
      reqMsg.textContent = "";
      reqMsg.className = "helper-text";
    }
    reqModal.classList.add("open");
  }

  function closeReqModal() {
    if (reqModal) reqModal.classList.remove("open");
  }

  if (openReqLink) {
    openReqLink.addEventListener("click", function (e) {
      e.preventDefault();
      openReqModal();
    });
  }

  if (cancelReqBtn) cancelReqBtn.addEventListener("click", closeReqModal);
  if (reqModal) {
    reqModal.addEventListener("click", function (e) {
      if (e.target === reqModal) closeReqModal();
    });
  }

  if (submitReqBtn) {
    submitReqBtn.addEventListener("click", async function () {
      const code = reqCodeInput ? reqCodeInput.value.trim() : "";
      const name = reqNameInput ? reqNameInput.value.trim() : "";
      const desc = reqDescInput ? reqDescInput.value.trim() : "";
      const schoolId = schoolSelect ? schoolSelect.value : "";
      const majorId = majorSelect ? majorSelect.value : "";

      if (!code || !name || !schoolId || !majorId) {
        if (reqMsg) {
          reqMsg.textContent = "Subject code, name, school, and major are required.";
          reqMsg.className = "helper-text error";
          reqMsg.style.display = "block";
        }
        return;
      }

      submitReqBtn.disabled = true;
      submitReqBtn.textContent = "Submitting...";
      if (reqMsg) reqMsg.style.display = "none";

      try {
        await createSubjectRequest({
          requestedCode: code,
          requestedName: name,
          description: desc,
          schoolId: Number(schoolId),
          majorId: Number(majorId)
        });
        if (window.showToast) {
          window.showToast("Your subject request has been submitted for admin review.", "success");
        }
        closeReqModal();
      } catch (err) {
        if (reqMsg) {
          reqMsg.textContent = err.message || "Failed to submit subject request.";
          reqMsg.className = "helper-text error";
          reqMsg.style.display = "block";
        }
      } finally {
        submitReqBtn.disabled = false;
        submitReqBtn.textContent = "Submit Request";
      }
    });
  }

  loadSchoolAndMajorOptions();
});

loadFolderOptions();
loadSubjectOptions();
loadUploadLimits();
