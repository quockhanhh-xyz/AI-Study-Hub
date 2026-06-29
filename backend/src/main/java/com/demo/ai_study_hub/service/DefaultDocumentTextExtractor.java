package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class DefaultDocumentTextExtractor implements DocumentTextExtractor {

    @Override
    public ExtractionResult extract(Document doc) {
        String ext = getFileExtension(doc.getOriginalFileName());
        if ("txt".equalsIgnoreCase(ext)) {
            String text = "Mock content for TXT file " + doc.getTitle();
            return ExtractionResult.builder()
                    .extractedText(text)
                    .status(ProcessingStatus.COMPLETED)
                    .chunks(Collections.singletonList(
                            ExtractionResult.ExtractedChunk.builder()
                                    .chunkIndex(0)
                                    .chunkText(text)
                                    .characterCount(text.length())
                                    .startOffset(0)
                                    .endOffset(text.length())
                                    .build()
                    ))
                    .build();
        } else if ("pdf".equalsIgnoreCase(ext)) {
            String text = "Mock content for PDF file " + doc.getTitle();
            return ExtractionResult.builder()
                    .extractedText(text)
                    .status(ProcessingStatus.COMPLETED)
                    .chunks(Collections.singletonList(
                            ExtractionResult.ExtractedChunk.builder()
                                    .chunkIndex(0)
                                    .chunkText(text)
                                    .characterCount(text.length())
                                    .pageNumber(1)
                                    .sourceLabel("Page 1")
                                    .startOffset(0)
                                    .endOffset(text.length())
                                    .build()
                    ))
                    .build();
        } else if ("doc".equalsIgnoreCase(ext) || "docx".equalsIgnoreCase(ext) || "pptx".equalsIgnoreCase(ext)) {
            return ExtractionResult.builder()
                    .status(ProcessingStatus.UNSUPPORTED)
                    .error("Document type not supported yet: " + ext)
                    .build();
        } else {
            return ExtractionResult.builder()
                    .status(ProcessingStatus.FAILED)
                    .error("Extraction failed: unknown file type")
                    .build();
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}
