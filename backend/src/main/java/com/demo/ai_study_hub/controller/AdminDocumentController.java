package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.PublicDocumentResponse;
import com.demo.ai_study_hub.service.AdminDocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/admin/documents")
public class AdminDocumentController {

    @Autowired
    private AdminDocumentService adminDocumentService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<PublicDocumentResponse>> getDocumentDetail(@PathVariable Integer id) {
        PublicDocumentResponse data = adminDocumentService.getAdminDocumentDetail(id);
        return ResponseEntity.ok(ApiResponse.success(data, "Document detail retrieved successfully"));
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<DocumentDownloadInfo>> previewDocument(@PathVariable Integer id) {
        DocumentDownloadInfo info = adminDocumentService.getAdminDocumentDownloadInfo(id);
        return ResponseEntity.ok(ApiResponse.success(info, "Document preview retrieved successfully"));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> downloadDocument(@PathVariable Integer id) {
        try {
            DocumentDownloadInfo downloadInfo = adminDocumentService.getAdminDocumentDownloadInfo(id);
            byte[] fileBytes = downloadRemoteFile(downloadInfo.getFileUrl());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(downloadInfo.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(downloadInfo.getFileName(), StandardCharsets.UTF_8)
                            .build()
                            .toString())
                    .body(fileBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to download file"));
        }
    }

    private byte[] downloadRemoteFile(String fileUrl) throws IOException {
        URLConnection connection = URI.create(fileUrl).toURL().openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(30000);
        try (InputStream inputStream = connection.getInputStream()) {
            return inputStream.readAllBytes();
        }
    }
}
