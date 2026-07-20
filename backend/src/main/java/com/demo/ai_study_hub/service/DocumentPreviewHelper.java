package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.enums.PreviewMode;
import org.springframework.stereotype.Component;

@Component
public class DocumentPreviewHelper {

    public String getMimeType(String fileType) {
        if (fileType == null) return "application/octet-stream";
        String upperType = fileType.toUpperCase();
        switch (upperType) {
            case "PDF": return "application/pdf";
            case "PNG": return "image/png";
            case "JPG":
            case "JPEG": return "image/jpeg";
            case "WEBP": return "image/webp";
            case "GIF": return "image/gif";
            case "TXT": return "text/plain";
            case "DOC": return "application/msword";
            case "DOCX": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "PPT": return "application/vnd.ms-powerpoint";
            case "PPTX": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case "XLS": return "application/vnd.ms-excel";
            case "XLSX": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default: return "application/octet-stream";
        }
    }

    public String getResourceType(String fileType) {
        if (fileType == null) return "raw";
        String upperType = fileType.toUpperCase();
        if (upperType.equals("PNG") || upperType.equals("JPG") || upperType.equals("JPEG") ||
            upperType.equals("WEBP") || upperType.equals("GIF")) {
            return "image";
        }
        return "raw";
    }

    public PreviewMode getPreviewMode(String fileType) {
        if (fileType == null) return PreviewMode.FALLBACK;
        String upperType = fileType.toUpperCase();
        switch (upperType) {
            case "PDF": return PreviewMode.PDF;
            case "PNG":
            case "JPG":
            case "JPEG":
            case "WEBP":
            case "GIF": return PreviewMode.IMAGE;
            case "TXT": return PreviewMode.TEXT;
            case "DOC":
            case "DOCX":
            case "PPT":
            case "PPTX":
            case "XLS":
            case "XLSX": return PreviewMode.OFFICE_VIEWER;
            default: return PreviewMode.FALLBACK;
        }
    }

    public String getPreviewUrl(String fileUrl, PreviewMode previewMode) {
        if (previewMode == PreviewMode.FALLBACK) {
            return null;
        }
        return fileUrl;
    }

    public String normalizeFileType(String fileType, String originalFileName) {
        String normalized = fileType;
        if (normalized == null || normalized.trim().isEmpty()) {
            if (originalFileName != null) {
                int lastDot = originalFileName.lastIndexOf('.');
                if (lastDot >= 0 && lastDot < originalFileName.length() - 1) {
                    normalized = originalFileName.substring(lastDot + 1);
                }
            }
        }
        return normalized == null ? "" : normalized.trim().replace(".", "").toUpperCase();
    }
}
