// document-preview.js – FE2: Only renders the preview, DOES NOT fetch on its own
// Called from document-detail.js after the document object is available

/**
 * Renders the preview area based on the received document object.
 * @param {Object} doc - Document object from the API (already fetched in document-detail.js)
 */
function renderDocumentPreview(doc) {
  const container = document.getElementById("previewArea");
  if (!container) return;

  const fileType = (doc.fileType || "").toLowerCase();

  if (!doc.canPreview) {
    renderFallback(container, fileType);
    return;
  }

  if (fileType === "pdf") {
    renderPdfPreview(container, doc.fileUrl);
  } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(fileType)) {
    renderImagePreview(container, doc.fileUrl, doc.title);
  } else if (fileType === "txt") {
    renderTxtPreview(container, doc.fileUrl);
  } else {
    renderFallback(container, fileType);
  }
}

function renderPdfPreview(container, fileUrl) {
  container.innerHTML = `
    <iframe
      src="${fileUrl}"
      class="preview-iframe"
      title="PDF Preview"
      frameborder="0"
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

function renderFallback(container, fileType) {
  const label = fileType ? fileType.toUpperCase() : "This file type";
  container.innerHTML = `
    <div class="preview-fallback">
      <div class="preview-fallback-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="48" height="48">
          <path stroke="currentColor" stroke-width="1.5"
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <path stroke="currentColor" stroke-width="1.5" d="M14 2v6h6"/>
        </svg>
      </div>
      <div class="preview-fallback-title">${label} files cannot be previewed</div>
      <div class="preview-fallback-desc">Use the Open or Download button below to access this file.</div>
    </div>
  `;
}