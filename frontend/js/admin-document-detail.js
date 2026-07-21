document.addEventListener("DOMContentLoaded", () => {
    if (window.authReady) {
        window.authReady
            .then((isAuthenticated) => {
                if (isAuthenticated) {
                    init();
                } else {
                    showLoadError("Please log in as an administrator.");
                }
            })
            .catch(() => showLoadError("Unable to verify admin session."));
    } else {
        init();
    }
});

function showLoadError(message) {
    const loadingState = document.getElementById("loadingState");
    const errorState = document.getElementById("errorState");
    const errorMessage = document.getElementById("errorMessage");
    if (loadingState) loadingState.style.display = "none";
    if (errorState) errorState.style.display = "flex";
    if (errorMessage) errorMessage.textContent = message || "An error occurred.";
}

let currentDocId = null;

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    currentDocId = urlParams.get('id');

    if (!currentDocId) {
        document.getElementById("loadingState").style.display = "none";
        document.getElementById("errorState").style.display = "flex";
        document.getElementById("errorMessage").textContent = "No document ID provided.";
        return;
    }

    loadDocumentDetails();
}

async function loadDocumentDetails() {
    document.getElementById("loadingState").style.display = "flex";
    document.getElementById("errorState").style.display = "none";
    document.getElementById("contentState").style.display = "none";

    try {
        const response = await fetchAdmin(`/api/admin/documents/${currentDocId}`, { method: 'GET' });
        if (response && response.success && response.data) {
            renderDetails(response.data);
            document.getElementById("loadingState").style.display = "none";
            document.getElementById("contentState").style.display = "block";
        } else {
            throw new Error(response?.message || "Failed to load document");
        }
    } catch (e) {
        console.error(e);
        document.getElementById("loadingState").style.display = "none";
        document.getElementById("errorState").style.display = "flex";
        document.getElementById("errorMessage").textContent = e.message || "An error occurred.";
    }
}

function renderDetails(doc) {
    document.getElementById("docIdVal").textContent = doc.documentId;
    document.getElementById("docTitleVal").textContent = doc.title || '-';
    document.getElementById("docOwnerVal").textContent = doc.displayName || '-';
    document.getElementById("docSubjectVal").textContent = doc.subjectCode ? `${doc.subjectCode} - ${doc.subjectName}` : '-';
    document.getElementById("docTypeVal").textContent = doc.fileType || '-';

    document.getElementById("docVisVal").innerHTML = `<span class="badge ${doc.visibility === 'PUBLIC' ? 'active' : ''}">${doc.visibility}</span>`;
    document.getElementById("docApprVal").innerHTML = `<span class="badge ${doc.approvalStatus.toLowerCase()}">${doc.approvalStatus}</span>`;
    document.getElementById("docProcVal").textContent = doc.processingStatus || '-';

    document.getElementById("docDateVal").textContent = doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '-';

    const approveBtn = document.getElementById("approveBtn");
    const rejectBtn = document.getElementById("rejectBtn");

    approveBtn.style.display = 'none';
    rejectBtn.style.display = 'none';

    if (doc.approvalStatus === 'PENDING') {
        approveBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
    } else if (doc.approvalStatus === 'APPROVED') {
        rejectBtn.style.display = 'inline-block';
    } else if (doc.approvalStatus === 'REJECTED') {
        approveBtn.style.display = 'inline-block';
    }

    approveBtn.onclick = handleApprove;
    rejectBtn.onclick = handleReject;

    document.getElementById("previewBtn").onclick = async () => {
        const container = document.getElementById("previewContainer");
        container.style.display = 'block';
        
        try {
            const res = await fetchAdmin(`/api/admin/documents/${currentDocId}/preview`, { method: 'GET' });
            if (res && res.success && res.data) {
                const previewInfo = res.data;
                const mode = previewInfo.previewMode || "FALLBACK";
                const previewUrl = previewInfo.previewUrl || previewInfo.fileUrl;
                
                if (mode === "FALLBACK" || !previewUrl) {
                    container.innerHTML = `
                      <div style="padding: 40px; text-align: center;">
                        <h3 style="margin-bottom: 10px;">Preview Unavailable</h3>
                        <p style="margin-bottom: 20px; color: #666;">This file type cannot be previewed natively.</p>
                        <a href="${previewInfo.fileUrl}" target="_blank" class="btn btn-outline">Open File</a>
                      </div>
                    `;
                    return;
                }
                
                if (mode === "OFFICE_VIEWER") {
                    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
                    container.innerHTML = `
                      <div style="height: 100%; display: flex; flex-direction: column;">
                        <div style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #ddd; text-align: center; font-size: 0.9rem; color: #555;">
                          If the preview does not load, <a href="${previewInfo.fileUrl}" target="_blank">open</a> the file.
                        </div>
                        <iframe src="${viewerUrl}" style="flex: 1; border: none; width: 100%; height: 600px;"></iframe>
                      </div>
                    `;
                } else if (mode === "IMAGE") {
                    container.innerHTML = `
                      <div style="display: flex; justify-content: center; align-items: center; padding: 20px; background: #f0f0f0; min-height: 400px;">
                        <img src="${previewUrl}" alt="Preview" style="max-width: 100%; max-height: 800px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                      </div>
                    `;
                } else {
                    // PDF or TEXT
                    container.innerHTML = `
                      <iframe src="${previewUrl}" style="border: none; width: 100%; height: 800px;"></iframe>
                    `;
                }
            } else {
                alert("Failed to load preview info");
            }
        } catch (e) {
            alert("Error loading preview: " + e.message);
        }
    };

    document.getElementById("downloadBtn").onclick = async () => {
        downloadFile(`/api/admin/documents/${currentDocId}/download`, doc.title || 'document');
    };
}

async function handleApprove() {
    try {
        await approveAdminDocument(currentDocId);
        loadDocumentDetails();
    } catch (e) {
        alert("Failed to approve: " + e.message);
    }
}

function handleReject() {
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectModal').classList.add('active');
}

document.getElementById('confirmRejectBtn').onclick = async () => {
    try {
        const reason = document.getElementById('rejectReason').value;
        await rejectAdminDocument(currentDocId, reason);
        document.getElementById('rejectModal').classList.remove('active');
        loadDocumentDetails();
    } catch (e) {
        alert("Failed to reject: " + e.message);
    }
};
