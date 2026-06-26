package com.demo.ai_study_hub.controller;

import com.demo.ai_study_hub.dto.ApiResponse;
import com.demo.ai_study_hub.dto.DocumentDownloadInfo;
import com.demo.ai_study_hub.dto.DocumentResponse;
import com.demo.ai_study_hub.dto.DocumentUpdateDTO;
import com.demo.ai_study_hub.dto.MoveDocumentRequest;
import com.demo.ai_study_hub.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLConnection;
import java.security.Principal;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "subjectId", required = true) Integer subjectId,
            @RequestParam(value = "folderId", required = false) Integer folderId,
            Principal principal
    ) {
        try {
            DocumentResponse data = documentService.uploadDocument(file, title, description, subjectId, folderId, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document uploaded successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getMyDocuments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer subjectId,
            @RequestParam(required = false) String fileType,
            @RequestParam(required = false) Integer folderId,
            @RequestParam(required = false) Boolean includeSubfolders,
            Principal principal) {
        try {
            List<DocumentResponse> data = documentService.getMyDocumentsWithFilters(
                    principal.getName(), keyword, subjectId, fileType, folderId, includeSubfolders);
            return ResponseEntity.ok(ApiResponse.success(data, "Documents retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocumentDetail(@PathVariable Integer id, Principal principal) {
        try {
            DocumentResponse data = documentService.getDocumentDetail(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document detail retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadDocument(@PathVariable Integer id, Principal principal) {
        try {
            DocumentDownloadInfo downloadInfo = documentService.getDocumentDownloadInfo(id, principal.getName());
            byte[] fileBytes = downloadRemoteFile(downloadInfo.getFileUrl());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(downloadInfo.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(downloadInfo.getFileName(), StandardCharsets.UTF_8)
                            .build()
                            .toString())
                    .body(fileBytes);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to download file"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
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

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateDocument(
            @PathVariable Integer id,
            @RequestBody DocumentUpdateDTO dto,
            Principal principal) {
        try {
            DocumentResponse data = documentService.updateDocument(id, dto, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document updated successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/move")
    public ResponseEntity<ApiResponse<DocumentResponse>> moveDocument(
            @PathVariable Integer id,
            @RequestBody MoveDocumentRequest request,
            Principal principal) {
        try {
            DocumentResponse data = documentService.moveDocument(id, request.getFolderId(), principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document moved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteDocument(@PathVariable Integer id, Principal principal) {
        try {
            documentService.deleteDocument(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(null, "Document deleted successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getPublicDocuments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer subjectId,
            @RequestParam(required = false) String fileType) {
        try {
            List<DocumentResponse> data = documentService.getPublicDocuments(keyword, subjectId, fileType);
            return ResponseEntity.ok(ApiResponse.success(data, "Public documents retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getPublicDocumentDetail(@PathVariable Integer id) {
        try {
            DocumentResponse data = documentService.getPublicDocumentDetail(id);
            return ResponseEntity.ok(ApiResponse.success(data, "Public document detail retrieved successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/public/{id}/download")
    public ResponseEntity<?> downloadPublicDocument(@PathVariable Integer id) {
        try {
            DocumentDownloadInfo downloadInfo = documentService.getPublicDocumentDownloadInfo(id);
            byte[] fileBytes = downloadRemoteFile(downloadInfo.getFileUrl());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(downloadInfo.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(downloadInfo.getFileName(), StandardCharsets.UTF_8)
                            .build()
                            .toString())
                    .body(fileBytes);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to download file"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<DocumentResponse>> publishDocument(
            @PathVariable Integer id,
            Principal principal) {
        try {
            DocumentResponse data = documentService.publishDocument(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document published successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/unpublish")
    public ResponseEntity<ApiResponse<DocumentResponse>> unpublishDocument(
            @PathVariable Integer id,
            Principal principal) {
        try {
            DocumentResponse data = documentService.unpublishDocument(id, principal.getName());
            return ResponseEntity.ok(ApiResponse.success(data, "Document unpublished successfully"));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error(e.getReason()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }
}
