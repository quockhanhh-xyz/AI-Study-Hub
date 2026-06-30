package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Primary
@Component
@RequiredArgsConstructor
public class RealDocumentTextExtractor implements DocumentTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(RealDocumentTextExtractor.class);

    private static final Set<String> SUPPORTED_TYPES = Set.of("PDF", "TXT");

    private final SecureFileDownloader secureFileDownloader;
    private final PdfTextExtractor pdfTextExtractor;
    private final TxtTextExtractor txtTextExtractor;
    private final TextCleaner textCleaner;
    private final TextChunker textChunker;

    @Override
    public ExtractionResult extract(Document doc) {
        String fileType = doc.getFileType() != null
                ? doc.getFileType().toUpperCase().trim()
                : "";

        if (!SUPPORTED_TYPES.contains(fileType)) {
            return ExtractionResult.builder()
                    .status(ProcessingStatus.UNSUPPORTED)
                    .error("File type not supported: " + fileType)
                    .originalCharacterCount(0)
                    .isTruncated(false)
                    .build();
        }

        // Step 1: Download file securely
        byte[] fileBytes;
        try {
            fileBytes = secureFileDownloader.download(doc.getFileUrl());
        } catch (SecureFileDownloader.DownloadException e) {
            log.warn("Failed to download file for documentId={}: {}", doc.getDocumentId(), e.getMessage());
            return ExtractionResult.builder()
                    .status(ProcessingStatus.FAILED)
                    .error("Failed to download file for extraction")
                    .originalCharacterCount(0)
                    .isTruncated(false)
                    .build();
        }

        // Step 2: Parse raw text by file type
        String rawText;
        List<Integer> pageStartOffsets = null;

        try {
            if ("PDF".equals(fileType)) {
                PdfTextExtractor.PdfExtractionResult pdfResult = pdfTextExtractor.extract(fileBytes);
                if (!pdfResult.success) {
                    return ExtractionResult.builder()
                            .status(ProcessingStatus.FAILED)
                            .error("PDF parsing failed")
                            .originalCharacterCount(0)
                            .isTruncated(false)
                            .build();
                }
                rawText = pdfResult.rawText;
                pageStartOffsets = pdfResult.pageStartOffsets;
            } else {
                rawText = txtTextExtractor.extract(fileBytes);
            }
        } catch (Exception e) {
            log.warn("Parser error for documentId={}: {}", doc.getDocumentId(), e.getMessage());
            return ExtractionResult.builder()
                    .status(ProcessingStatus.FAILED)
                    .error("File parsing failed")
                    .originalCharacterCount(0)
                    .isTruncated(false)
                    .build();
        }

        // Step 3: Clean text
        TextCleaner.CleanResult cleaned = textCleaner.clean(rawText);

        if (cleaned.cleanedText == null || cleaned.cleanedText.isBlank()) {
            return ExtractionResult.builder()
                    .status(ProcessingStatus.EMPTY_CONTENT)
                    .error("No extractable text found in document")
                    .originalCharacterCount(cleaned.originalCharacterCount)
                    .isTruncated(false)
                    .build();
        }

        // Step 4: Chunk text
        List<ExtractionResult.ExtractedChunk> chunks = pageStartOffsets != null
                ? textChunker.chunkWithPages(cleaned.cleanedText, pageStartOffsets)
                : textChunker.chunk(cleaned.cleanedText);

        return ExtractionResult.builder()
                .status(ProcessingStatus.COMPLETED)
                .extractedText(cleaned.cleanedText)
                .originalCharacterCount(cleaned.originalCharacterCount)
                .isTruncated(cleaned.isTruncated)
                .chunks(chunks)
                .build();
    }
}
