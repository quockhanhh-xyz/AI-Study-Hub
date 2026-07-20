// document-preview.js – FE2: Only renders the preview, DOES NOT fetch on its own
// Called from document-detail.js after the document object is available

/**
 * Renders the preview area based on the received document object.
 * @param {Object} doc - Document object from the API (already fetched in document-detail.js)
 */
function renderDocumentPreview(doc) {
  const container = document.getElementById("previewArea");
  if (!container) return;

  const mode = resolvePreviewMode(doc);
  const previewUrl = doc.previewUrl || doc.fileUrl;
  const hasPreviewAccess =
    doc.canPreview !== false || doc.canOpen === true || doc.canDownload === true;

  if (!hasPreviewAccess || mode === "FALLBACK" || !previewUrl) {
    renderFallback(container, doc);
    return;
  }

  switch (mode) {
    case "PDF":
      renderPdfPreview(container, previewUrl);
      break;
    case "IMAGE":
      renderImagePreview(container, previewUrl, doc.title);
      break;
    case "TEXT":
      renderTxtPreview(container, previewUrl);
      break;
    case "OFFICE_VIEWER":
      renderOfficePreview(container, previewUrl, doc);
      break;
    default:
      renderFallback(container, doc);
  }
}

function resolvePreviewMode(doc) {
  const mode = normalizePreviewMode(doc.previewMode);
  if (mode !== "FALLBACK") return mode;

  const fileType = normalizeFileType(doc.fileType || doc.originalFileName);
  switch (fileType) {
    case "PDF":
      return "PDF";
    case "PNG":
    case "JPG":
    case "JPEG":
    case "WEBP":
    case "GIF":
      return "IMAGE";
    case "TXT":
      return "TEXT";
    case "DOC":
    case "DOCX":
    case "PPT":
    case "PPTX":
    case "XLS":
    case "XLSX":
      return "OFFICE_VIEWER";
    default:
      return "FALLBACK";
  }
}

function normalizePreviewMode(mode) {
  const value = String(mode || "").trim().toUpperCase();
  return ["PDF", "IMAGE", "TEXT", "OFFICE_VIEWER", "FALLBACK"].includes(value)
    ? value
    : "FALLBACK";
}

function normalizeFileType(value) {
  const raw = String(value || "").trim();
  const extension = raw.includes(".") ? raw.slice(raw.lastIndexOf(".") + 1) : raw;
  return extension.replace(".", "").toUpperCase();
}

function renderPdfPreview(container, fileUrl) {
  const pdfUrlWithZoom = fileUrl.includes("#") ? fileUrl : `${fileUrl}#view=FitH`;
  container.innerHTML = `
    <iframe
      src="${pdfUrlWithZoom}"
      class="preview-iframe"
      title="PDF Preview"
      frameborder="0"
      style="width: 100%; height: 100%; border: 0;"
    ></iframe>
  `;
}

function renderImagePreview(container, fileUrl, title) {
  const wrap = document.createElement("div");
  wrap.className = "preview-image-wrap";

  const img = document.createElement("img");
  img.src = fileUrl;
  img.alt = title || "Document preview";
  img.className = "preview-image";

  wrap.appendChild(img);
  container.innerHTML = "";
  container.appendChild(wrap);
}

function renderTxtPreview(container, fileUrl) {
  container.innerHTML = `
    <iframe
      src="${fileUrl}"
      class="preview-iframe"
      title="Text Preview"
      frameborder="0"
    ></iframe>
  `;
}

function renderOfficePreview(container, previewUrl, doc) {
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
  const downloadUrl = doc.downloadUrl || `/api/documents/${doc.documentId}/download`;

  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      <div style="padding: 10px; background: var(--bg-card); border-bottom: 1px solid var(--border-color); text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
        If the preview does not load, <a href="${doc.fileUrl || previewUrl}" target="_blank" class="btn-link">open</a>
        or <a href="#" onclick="event.preventDefault(); window.location.href = API_BASE_URL + '${downloadUrl}'" class="btn-link">download</a> the file.
      </div>
      <iframe
        src="${viewerUrl}"
        class="preview-iframe"
        title="Office Preview"
        frameborder="0"
        style="flex: 1;"
      ></iframe>
    </div>
  `;
}

function renderFallback(container, doc) {
  const label = normalizeFileType(doc.fileType || doc.originalFileName) || "This file type";
  const openUrl = doc.fileUrl || "#";
  const downloadUrl = doc.downloadUrl || `/api/documents/${doc.documentId}/download`;
  const canOpen = doc.canOpen !== false;
  const canDownload = doc.canDownload !== false;

  container.innerHTML = `
    <div class="preview-fallback">
      <div class="preview-fallback-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="48" height="48">
          <path stroke="currentColor" stroke-width="1.5"
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path stroke="currentColor" stroke-width="1.5" d="M14 2v6h6"/>
        </svg>
      </div>
      <div class="preview-fallback-title">Preview unavailable</div>
      <div class="preview-fallback-desc">${label} preview is not available. Use Open File or Download to access this document.</div>
      <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
        <a href="${openUrl}" target="_blank" class="btn btn-outline" ${canOpen ? "" : 'disabled style="pointer-events:none; opacity:0.5;"'}>Open File</a>
        <button onclick="window.location.href = API_BASE_URL + '${downloadUrl}'" class="btn btn-primary" ${canDownload ? "" : "disabled"}>Download</button>
      </div>
    </div>
  `;
}
