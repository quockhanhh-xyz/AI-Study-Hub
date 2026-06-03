
// ── Auth guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem("accessToken");
if (!token) {
  window.location.href = "login.html";
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const uploadForm      = document.getElementById("uploadForm");
const titleInput      = document.getElementById("title");
const descInput       = document.getElementById("description");
const fileInput       = document.getElementById("file");
const dropZone        = document.getElementById("dropZone");
const dropZoneText    = document.getElementById("dropZoneText");
const submitBtn       = document.getElementById("submitBtn");
const uploadMessage   = document.getElementById("uploadMessage");
const uploadProgress  = document.getElementById("uploadProgress");
const progressFill    = document.getElementById("progressFill");
const progressText    = document.getElementById("progressText");

// ── Constants ─────────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg"
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

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
    dropZoneText.innerHTML = `📄 <strong>${file.name}</strong><br/><small>${formatFileSize(file.size)}</small>`;
    dropZone.classList.add("has-file");
  } else {
    dropZoneText.innerHTML = `Chọn file hoặc kéo thả vào đây<br/><small>(PDF, DOCX, PPTX, TXT, PNG, JPG — tối đa 10MB)</small>`;
    dropZone.classList.remove("has-file");
  }
}

function validateFile(file) {
  if (!file) return "Vui lòng chọn file.";
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Loại file không hợp lệ. Chỉ chấp nhận: PDF, DOCX, PPTX, TXT, PNG, JPG, JPEG.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File quá lớn (${formatFileSize(file.size)}). Tối đa 10MB.`;
  }
  return null;
}

// ── Progress bar (giả lập vì fetch không có progress event) ──────────────────
function showProgress() {
  uploadProgress.style.display = "block";
  progressFill.style.width = "0%";
  progressText.textContent = "Đang tải lên...";

  // Tăng dần đến 90% để tạo cảm giác progress, 100% sẽ set khi done
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 15;
    if (pct >= 90) {
      pct = 90;
      clearInterval(interval);
    }
    progressFill.style.width = pct + "%";
    progressText.textContent = `Đang tải lên: ${Math.round(pct)}%`;
  }, 300);

  return interval;
}

function completeProgress(interval) {
  clearInterval(interval);
  progressFill.style.width = "100%";
  progressText.textContent = "Hoàn thành: 100%";
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

// ── Keyboard accessibility cho drop zone ─────────────────────────────────────
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

// ── Drag & Drop ───────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (e) => {
  // Chỉ remove khi rời khỏi drop-zone thật sự (không phải rời child element)
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
    showMessage("Tiêu đề không được để trống.", "error");
    titleInput.focus();
    return;
  }

  const fileError = validateFile(file);
  if (fileError) {
    showMessage(fileError, "error");
    return;
  }

  // Build FormData — không set Content-Type, browser tự xử lý
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (description) formData.append("description", description);

  // Loading state
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang upload...";
  const progressInterval = showProgress();

  try {
    const result = await uploadDocument(formData);
    completeProgress(progressInterval);
    showMessage(`✅ Upload thành công: "${result.data.title}"`, "success");

    // Reset form
    uploadForm.reset();
    updateDropZone(null);

    // Chuyển về dashboard sau 1.5 giây
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (err) {
    clearInterval(progressInterval);
    hideProgress();
    showMessage(`❌ ${err.message}`, "error");

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Upload tài liệu";
  }
});