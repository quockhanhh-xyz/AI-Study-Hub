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


        String cleanedText;
        List<Integer> pageStartOffsets = null;
        int originalCharacterCount;
        boolean isTruncated;

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

                TextCleaner.CleanPagesResult cleanedPages = textCleaner.cleanPages(pdfResult.pageTexts);

                if (cleanedPages.cleanedText == null || cleanedPages.cleanedText.isBlank()) {
                    return ExtractionResult.builder()
                        .status(ProcessingStatus.EMPTY_CONTENT)
                        .error("No extractable text found in document")
                        .originalCharacterCount(cleanedPages.originalCharacterCount)
                        .isTruncated(false)
                        .build();
                }

                cleanedText = cleanedPages.cleanedText;
                pageStartOffsets = cleanedPages.pageStartOffsets;
                originalCharacterCount = cleanedPages.originalCharacterCount;
                isTruncated = cleanedPages.isTruncated;

            } else {
                String rawText = txtTextExtractor.extract(fileBytes);
                TextCleaner.CleanResult cleaned = textCleaner.clean(rawText);

                if (cleaned.cleanedText == null || cleaned.cleanedText.isBlank()) {
                    return ExtractionResult.builder()
                        .status(ProcessingStatus.EMPTY_CONTENT)
                        .error("No extractable text found in document")
                        .originalCharacterCount(cleaned.originalCharacterCount)
                        .isTruncated(false)
                        .build();
                }

                cleanedText = cleaned.cleanedText;
                originalCharacterCount = cleaned.originalCharacterCount;
                isTruncated = cleaned.isTruncated;
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

        List<ExtractionResult.ExtractedChunk> chunks = pageStartOffsets != null
            ? textChunker.chunkWithPages(cleanedText, pageStartOffsets)
            : textChunker.chunk(cleanedText);

        return ExtractionResult.builder()
            .status(ProcessingStatus.COMPLETED)
            .extractedText(cleanedText)
            .originalCharacterCount(originalCharacterCount)
            .isTruncated(isTruncated)
            .chunks(chunks)
            .build();
    }
}
