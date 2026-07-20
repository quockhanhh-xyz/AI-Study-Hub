package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.repository.DocumentRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import com.demo.ai_study_hub.service.DocumentService;

@Service
public class AdminDocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentService documentService;
    
    @Autowired
    private DocumentPreviewHelper previewHelper;

    public List<PublicDocumentResponse> getAdminPublicDocuments(String keyword, Integer subjectId, String fileType, String approvalStatus) {
        List<Document> documents = documentRepository.findPublicDocumentsForAdminExport(keyword, approvalStatus, fileType, subjectId);
        return documents.stream()
                .map(d -> documentService.mapToPublicResponse(d, null))
                .collect(Collectors.toList());
    }

    public PublicDocumentResponse getAdminDocumentDetail(Integer id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(document.getStatus()) || !"PUBLIC".equals(document.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Document is not accessible for public moderation");
        }
        return documentService.mapToPublicResponse(document, null); // userEmail = null because Admin viewing
    }

    public DocumentDownloadInfo getAdminDocumentDownloadInfo(Integer id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(document.getStatus()) || !"PUBLIC".equals(document.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Document is not accessible for public moderation");
        }

        String url = document.getFileUrl();

        String fileType = document.getFileType() != null ? document.getFileType() : "";
        if (fileType.trim().isEmpty() && document.getOriginalFileName() != null) {
            int lastDot = document.getOriginalFileName().lastIndexOf('.');
            if (lastDot >= 0 && lastDot < document.getOriginalFileName().length() - 1) {
                fileType = document.getOriginalFileName().substring(lastDot + 1);
            }
        }
        fileType = fileType.trim().replace(".", "").toUpperCase();
        
        com.demo.ai_study_hub.enums.PreviewMode previewMode = previewHelper.getPreviewMode(fileType);

        DocumentDownloadInfo info = new DocumentDownloadInfo();
        info.setFileUrl(url);
        info.setFileName(documentService.resolveDownloadFileName(document));
        info.setContentType(documentService.resolveContentType(document));
        info.setMimeType(previewHelper.getMimeType(fileType));
        info.setResourceType(previewHelper.getResourceType(fileType));
        info.setPreviewUrl(previewHelper.getPreviewUrl(url, previewMode));
        info.setDownloadUrl("/api/admin/documents/" + document.getDocumentId() + "/download");
        info.setPreviewMode(previewMode);
        return info;
    }

    public PublicDocumentResponse approveDocument(Integer id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(document.getStatus()) || !"PUBLIC".equals(document.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Document is not accessible for public moderation");
        }

        document.setApprovalStatus("APPROVED");
        document = documentRepository.save(document);
        return documentService.mapToPublicResponse(document, null);
    }

    public PublicDocumentResponse rejectDocument(Integer id, String rejectReason) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        if (!"ACTIVE".equals(document.getStatus()) || !"PUBLIC".equals(document.getVisibility())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Document is not accessible for public moderation");
        }

        document.setApprovalStatus("REJECTED");
        document = documentRepository.save(document);
        return documentService.mapToPublicResponse(document, null);
    }

    public byte[] exportPublicDocuments() {
        List<Document> documents = documentRepository.findPublicDocumentsForAdminExport(null, null, null, null);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Public Documents");
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("Document ID");
            headerRow.createCell(1).setCellValue("Title");
            headerRow.createCell(2).setCellValue("Owner Email");
            headerRow.createCell(3).setCellValue("Subject");
            headerRow.createCell(4).setCellValue("Approval Status");
            headerRow.createCell(5).setCellValue("Created At");
            headerRow.createCell(6).setCellValue("Published At");

            int rowIdx = 1;
            for (Document doc : documents) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(doc.getDocumentId());
                row.createCell(1).setCellValue(doc.getTitle());
                row.createCell(2).setCellValue(doc.getOwner() != null ? doc.getOwner().getEmail() : "");
                row.createCell(3).setCellValue(doc.getSubject() != null ? doc.getSubject().getSubjectName() : "");
                row.createCell(4).setCellValue(doc.getApprovalStatus());
                row.createCell(5).setCellValue(doc.getCreatedAt() != null ? doc.getCreatedAt().toString() : "");
                row.createCell(6).setCellValue(doc.getPublishedAt() != null ? doc.getPublishedAt().toString() : "");
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error exporting documents to Excel", e);
        }
    }
}
