document.addEventListener('DOMContentLoaded', () => {
    if (window.authReady) {
        window.authReady.then((isAuthenticated) => {
            if (isAuthenticated) init();
        });
    } else {
        init();
    }
});

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
        document.getElementById("previewContainer").style.display = 'block';
        try {
            const res = await fetchAdmin(`/api/admin/documents/${currentDocId}/preview`, { method: 'GET' });
            if (res && res.success && res.data && res.data.fileUrl) {
                document.getElementById("previewFrame").src = res.data.fileUrl;
            } else {
                alert("Failed to load preview URL");
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
