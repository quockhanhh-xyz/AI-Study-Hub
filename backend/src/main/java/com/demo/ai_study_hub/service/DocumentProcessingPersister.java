package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.*;
import com.demo.ai_study_hub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentProcessingPersister {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentChunkRepository documentChunkRepository;

    @Transactional
    public void saveSuccess(Integer documentId, ExtractionResult result) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!"ACTIVE".equals(doc.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Document is not active");
        }

        DocumentContent content = documentContentRepository.findByDocumentIdForWrite(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        // Clean existing chunks
        documentChunkRepository.deleteByDocumentId(documentId);

        // Calculate counts
        String text = result.getExtractedText() != null ? result.getExtractedText() : "";
        int charCount = text.length();
        int wordCount = text.trim().isEmpty() ? 0 : text.split("\\s+").length;

        content.setExtractedText(text);
        content.setProcessingStatus(ProcessingStatus.COMPLETED);
        content.setCharacterCount(charCount);
        content.setOriginalCharacterCount(result.getOriginalCharacterCount() != null ? result.getOriginalCharacterCount() : charCount);
        content.setWordCount(wordCount);
        content.setIsTruncated(result.getIsTruncated() != null ? result.getIsTruncated() : false);
        content.setProcessedAt(LocalDateTime.now());
        content.setLastAttemptStatus(ProcessingStatus.COMPLETED);
        content.setLastAttemptError(null);
        content.setLastAttemptedAt(LocalDateTime.now());

        documentContentRepository.save(content);

        // Save chunks
        if (result.getChunks() != null) {
            List<DocumentChunk> chunks = result.getChunks().stream().map(c -> DocumentChunk.builder()
                    .document(doc)
                    .chunkIndex(c.getChunkIndex())
                    .chunkText(c.getChunkText())
                    .characterCount(c.getCharacterCount())
                    .pageNumber(c.getPageNumber())
                    .sourceLabel(c.getSourceLabel())
                    .startOffset(c.getStartOffset())
                    .endOffset(c.getEndOffset())
                    .build()
            ).collect(Collectors.toList());

            documentChunkRepository.saveAll(chunks);
        }
    }

    @Transactional
    public void saveFailure(Integer documentId, ProcessingStatus failStatus, String errorMessage, ProcessingStatus previousStatus) {
        DocumentContent content = documentContentRepository.findByDocumentIdForWrite(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content not found"));

        if (previousStatus == ProcessingStatus.COMPLETED) {
            // Keep old data, only update attempt logs
            content.setProcessingStatus(ProcessingStatus.COMPLETED);
            content.setLastAttemptStatus(failStatus);
            content.setLastAttemptError(errorMessage);
            content.setLastAttemptedAt(LocalDateTime.now());
        } else {
            content.setProcessingStatus(failStatus);
            content.setLastAttemptStatus(failStatus);
            content.setLastAttemptError(errorMessage);
            content.setLastAttemptedAt(LocalDateTime.now());
            // Clear content and chunks
            content.setExtractedText(null);
            content.setCharacterCount(0);
            content.setOriginalCharacterCount(0);
            content.setWordCount(0);
            content.setIsTruncated(false);
            documentChunkRepository.deleteByDocumentId(documentId);
        }
        documentContentRepository.save(content);
    }
}
