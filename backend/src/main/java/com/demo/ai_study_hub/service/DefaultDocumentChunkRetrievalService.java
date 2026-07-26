package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.dto.DocumentChunkDto;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Default implementation of DocumentChunkRetrievalService.
 *
 * Strategy 1 - Keyword retrieval:
 *   - Normalize question: lowercase, remove punctuation, split into words
 *   - Remove common stop words
 *   - Score each chunk by total keyword frequency
 *   - Return top-N chunks with score > 0
 *
 * Strategy 2 - Summary/first-N retrieval:
 *   - Return first N chunks by chunk_index
 *
 * BE2 may enhance this with TF-IDF scoring or embedding-based retrieval.
 */
@Service
@RequiredArgsConstructor
public class DefaultDocumentChunkRetrievalService implements DocumentChunkRetrievalService {

    private final DocumentChunkRepository documentChunkRepository;

    @PersistenceContext
    private final EntityManager entityManager;

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            // English
            "a", "an", "the", "is", "it", "in", "on", "at", "to", "for",
            "of", "and", "or", "but", "this", "that", "be", "are", "was",
            "were", "has", "have", "had", "do", "does", "did", "with",
            "from", "by", "as", "into", "than", "then", "so", "if", "not",
            "no", "can", "will", "would", "could", "should", "may", "might",
            "i", "you", "we", "they", "he", "she", "me", "us", "them",
            "my", "your", "our", "their", "its", "about", "what", "how",
            "when", "where", "who", "which", "there", "here", "been",
            // Vietnamese common function words (diacritics preserved by the tokenizer)
            "và", "là", "của", "có", "cho", "trong", "với", "các", "được", "này",
            "đó", "một", "những", "khi", "đã", "để", "tôi", "bạn", "về", "như",
            "thì", "mà", "ở", "ra", "nên", "hay", "hoặc", "cũng", "rất", "đến",
            "từ", "theo", "vì", "nếu", "giúp", "làm", "gì", "nào", "sao", "hãy",
            "cần", "muốn", "phải", "sẽ", "đang", "bị", "hơn", "vào", "vẫn"
    ));

    // Keep Unicode letters/digits (so Vietnamese diacritics survive); strip only punctuation/symbols.
    private static final Pattern NON_ALPHA = Pattern.compile("[^\\p{L}\\p{N}\\s]");

    @Override
    public List<DocumentChunkDto> retrieveByKeyword(Integer documentId, String question, int topK) {
        List<com.demo.ai_study_hub.entity.DocumentChunk> allChunks =
                documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(documentId);

        if (allChunks.isEmpty()) return Collections.emptyList();

        Set<String> keywords = extractKeywords(question);
        if (keywords.isEmpty()) return Collections.emptyList();

        // Score each chunk
        List<Map.Entry<com.demo.ai_study_hub.entity.DocumentChunk, Double>> scored = new ArrayList<>();
        for (com.demo.ai_study_hub.entity.DocumentChunk chunk : allChunks) {
            double score = scoreChunk(chunk.getChunkText(), keywords);
            if (score > 0) {
                scored.add(Map.entry(chunk, score));
            }
        }

        // Sort by score desc, take top-K
        return scored.stream()
                .sorted(Map.Entry.<com.demo.ai_study_hub.entity.DocumentChunk, Double>comparingByValue()
                        .reversed())
                .limit(topK)
                .map(e -> toDto(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    @Override
    public List<DocumentChunkDto> retrieveFirstChunks(Integer documentId, int topK) {
        return documentChunkRepository
                .findByDocument_DocumentIdOrderByChunkIndexAsc(documentId)
                .stream()
                .limit(topK)
                .map(chunk -> toDto(chunk, 0.0))
                .collect(Collectors.toList());
    }

    // --- Private helpers ---

    private Set<String> extractKeywords(String question) {
        if (question == null || question.isBlank()) return Collections.emptySet();
        String normalized = NON_ALPHA.matcher(question.toLowerCase()).replaceAll(" ");
        return Arrays.stream(normalized.split("\\s+"))
                .filter(w -> w.length() > 2 && !STOP_WORDS.contains(w))
                .collect(Collectors.toSet());
    }

    private double scoreChunk(String chunkText, Set<String> keywords) {
        if (chunkText == null || chunkText.isBlank()) return 0.0;
        String lower = chunkText.toLowerCase();
        double score = 0.0;
        for (String keyword : keywords) {
            int count = 0;
            int idx = 0;
            while ((idx = lower.indexOf(keyword, idx)) != -1) {
                count++;
                idx += keyword.length();
            }
            score += count;
        }
        return score;
    }

    private DocumentChunkDto toDto(com.demo.ai_study_hub.entity.DocumentChunk chunk, double score) {
        return toDto(chunk, score, null);
    }

    private DocumentChunkDto toDto(com.demo.ai_study_hub.entity.DocumentChunk chunk, double score, Integer currentUserId) {
        String sourceLib = "Shared Library";
        if (chunk.getDocument() != null) {
            if (chunk.getDocument().getOwner() != null && currentUserId != null && chunk.getDocument().getOwner().getUserId().equals(currentUserId)) {
                sourceLib = "My Library";
            } else if ("PUBLIC".equals(chunk.getDocument().getVisibility()) && "APPROVED".equals(chunk.getDocument().getApprovalStatus())) {
                sourceLib = "Community Library";
            }
        }
        return DocumentChunkDto.builder()
                .chunkId(chunk.getChunkId())
                .chunkIndex(chunk.getChunkIndex())
                .chunkText(chunk.getChunkText())
                .pageNumber(chunk.getPageNumber())
                .sourceLabel(chunk.getSourceLabel() != null ? chunk.getSourceLabel()
                        : "Chunk " + (chunk.getChunkIndex() + 1))
                .documentId(chunk.getDocument() != null ? chunk.getDocument().getDocumentId() : null)
                .documentTitle(chunk.getDocument() != null ? chunk.getDocument().getTitle() : null)
                .sourceLibrary(sourceLib)
                .score(score)
                .build();
    }

    @Override
    public List<DocumentChunkDto> retrieveGlobalChunksByKeyword(Integer userId, String question, int topK) {
        Set<String> keywords = extractKeywords(question);
        if (keywords.isEmpty()) return Collections.emptyList();

        StringBuilder jpql = new StringBuilder();
        jpql.append("SELECT dc FROM DocumentChunk dc ");
        jpql.append("JOIN FETCH dc.document d ");
        jpql.append("JOIN FETCH d.owner o ");
        jpql.append("LEFT JOIN d.documentContent dcContent ");
        jpql.append("WHERE d.status = 'ACTIVE' ");
        jpql.append("AND dcContent IS NOT NULL ");
        jpql.append("AND dcContent.processingStatus = :completedStatus ");
        jpql.append("AND (");
        jpql.append("  o.userId = :userId ");
        jpql.append("  OR (d.visibility = 'PUBLIC' AND d.approvalStatus = 'APPROVED' AND o.status = 'ACTIVE') ");
        jpql.append("  OR EXISTS (SELECT ds FROM DocumentShare ds WHERE ds.document = d AND ds.sharedWith.userId = :userId AND ds.status = 'ACTIVE') ");
        jpql.append("  OR EXISTS (SELECT gds FROM GroupDocumentShare gds, StudyGroupMember sgm ");
        jpql.append("             WHERE gds.group = sgm.group ");
        jpql.append("             AND gds.document = d ");
        jpql.append("             AND sgm.user.userId = :userId ");
        jpql.append("             AND gds.status = 'ACTIVE' ");
        jpql.append("             AND sgm.status = 'ACTIVE' ");
        jpql.append("             AND gds.group.status = 'ACTIVE') ");
        jpql.append(") ");

        jpql.append("AND (");
        int keywordIdx = 0;
        for (String ignored : keywords) {
            if (keywordIdx > 0) {
                jpql.append(" OR ");
            }
            jpql.append("LOWER(cast(dc.chunkText as string)) LIKE :keyword_" + keywordIdx);
            keywordIdx++;
        }
        jpql.append(")");

        TypedQuery<com.demo.ai_study_hub.entity.DocumentChunk> query =
                entityManager.createQuery(jpql.toString(), com.demo.ai_study_hub.entity.DocumentChunk.class);
        query.setParameter("userId", userId);
        query.setParameter("completedStatus", com.demo.ai_study_hub.entity.ProcessingStatus.COMPLETED);
        
        keywordIdx = 0;
        for (String keyword : keywords) {
            query.setParameter("keyword_" + keywordIdx, "%" + keyword.toLowerCase() + "%");
            keywordIdx++;
        }

        query.setMaxResults(100);
        List<com.demo.ai_study_hub.entity.DocumentChunk> candidateChunks = query.getResultList();

        if (candidateChunks.isEmpty()) return Collections.emptyList();

        List<Map.Entry<com.demo.ai_study_hub.entity.DocumentChunk, Double>> scored = new ArrayList<>();
        for (com.demo.ai_study_hub.entity.DocumentChunk chunk : candidateChunks) {
            double score = scoreChunk(chunk.getChunkText(), keywords);
            if (score > 0) {
                scored.add(Map.entry(chunk, score));
            }
        }

        return scored.stream()
                .sorted(Map.Entry.<com.demo.ai_study_hub.entity.DocumentChunk, Double>comparingByValue()
                        .reversed())
                .limit(topK)
                .map(e -> toDto(e.getKey(), e.getValue(), userId))
                .collect(Collectors.toList());
    }

    /**
     * Fetch accessible, COMPLETED chunks for a user WITHOUT any keyword filter, capped at {@code cap}.
     * Uses the exact same access-control predicate as {@link #retrieveGlobalChunksByKeyword} so no
     * permission is leaked. Used by hybrid global retrieval to build a semantic candidate pool.
     */
    public List<com.demo.ai_study_hub.entity.DocumentChunk> findGlobalCandidateChunks(Integer userId, int cap) {
        String jpql = "SELECT dc FROM DocumentChunk dc "
                + "JOIN FETCH dc.document d "
                + "JOIN FETCH d.owner o "
                + "LEFT JOIN d.documentContent dcContent "
                + "WHERE d.status = 'ACTIVE' "
                + "AND dcContent IS NOT NULL "
                + "AND dcContent.processingStatus = :completedStatus "
                + "AND ("
                + "  o.userId = :userId "
                + "  OR (d.visibility = 'PUBLIC' AND d.approvalStatus = 'APPROVED' AND o.status = 'ACTIVE') "
                + "  OR EXISTS (SELECT ds FROM DocumentShare ds WHERE ds.document = d AND ds.sharedWith.userId = :userId AND ds.status = 'ACTIVE') "
                + "  OR EXISTS (SELECT gds FROM GroupDocumentShare gds, StudyGroupMember sgm "
                + "             WHERE gds.group = sgm.group "
                + "             AND gds.document = d "
                + "             AND sgm.user.userId = :userId "
                + "             AND gds.status = 'ACTIVE' "
                + "             AND sgm.status = 'ACTIVE' "
                + "             AND gds.group.status = 'ACTIVE') "
                + ") "
                + "ORDER BY dc.chunkId";

        TypedQuery<com.demo.ai_study_hub.entity.DocumentChunk> query =
                entityManager.createQuery(jpql, com.demo.ai_study_hub.entity.DocumentChunk.class);
        query.setParameter("userId", userId);
        query.setParameter("completedStatus", com.demo.ai_study_hub.entity.ProcessingStatus.COMPLETED);
        query.setMaxResults(Math.max(1, cap));
        return query.getResultList();
    }

    /** Build a global-scope DTO (with correct sourceLibrary) for a chunk. Reused by hybrid retrieval. */
    public DocumentChunkDto buildGlobalDto(com.demo.ai_study_hub.entity.DocumentChunk chunk, double score, Integer userId) {
        return toDto(chunk, score, userId);
    }
}
