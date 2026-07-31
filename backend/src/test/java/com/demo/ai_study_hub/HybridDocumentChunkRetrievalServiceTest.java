package com.demo.ai_study_hub;

import com.demo.ai_study_hub.config.AiProperties;
import com.demo.ai_study_hub.dto.DocumentChunkDto;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentChunk;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.service.ChunkEmbeddingService;
import com.demo.ai_study_hub.service.DefaultDocumentChunkRetrievalService;
import com.demo.ai_study_hub.service.HybridDocumentChunkRetrievalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Verifies the safety guarantees of hybrid retrieval:
 *  - keyword strategy is a pure pass-through (original behavior preserved),
 *  - hybrid falls back to keyword when embeddings are unavailable,
 *  - hybrid re-ranks so a semantically-relevant chunk the keyword search missed can surface.
 */
@ExtendWith(MockitoExtension.class)
class HybridDocumentChunkRetrievalServiceTest {

    @Mock
    private DefaultDocumentChunkRetrievalService keywordService;
    @Mock
    private ChunkEmbeddingService chunkEmbeddingService;
    @Mock
    private DocumentChunkRepository documentChunkRepository;

    private AiProperties aiProperties;
    private HybridDocumentChunkRetrievalService hybrid;

    @BeforeEach
    void setUp() {
        aiProperties = new AiProperties();
        hybrid = new HybridDocumentChunkRetrievalService(
                keywordService, chunkEmbeddingService, documentChunkRepository, aiProperties);
    }

    @Test
    void keywordStrategyDelegatesWithoutTouchingEmbeddings() {
        aiProperties.getRetrieval().setStrategy("keyword");
        List<DocumentChunkDto> expected = List.of(dto(1L, 0.9));
        when(keywordService.retrieveByKeyword(1, "q", 3)).thenReturn(expected);

        List<DocumentChunkDto> result = hybrid.retrieveByKeyword(1, "q", 3);

        assertSame(expected, result);
        verifyNoInteractions(chunkEmbeddingService);
        verifyNoInteractions(documentChunkRepository);
    }

    @Test
    void hybridFallsBackToKeywordWhenQueryEmbeddingUnavailable() {
        aiProperties.getRetrieval().setStrategy("hybrid");
        List<DocumentChunkDto> expected = List.of(dto(1L, 0.5));
        when(chunkEmbeddingService.embedQuery("q")).thenReturn(null);
        when(keywordService.retrieveByKeyword(1, "q", 3)).thenReturn(expected);

        List<DocumentChunkDto> result = hybrid.retrieveByKeyword(1, "q", 3);

        assertSame(expected, result);
        verify(documentChunkRepository, never()).findByDocument_DocumentIdOrderByChunkIndexAsc(anyInt());
    }

    @Test
    void hybridFallsBackToKeywordWhenNoChunkHasEmbedding() {
        aiProperties.getRetrieval().setStrategy("hybrid");
        when(chunkEmbeddingService.embedQuery("q")).thenReturn(new float[]{1f, 0f});
        DocumentChunk c1 = chunk(10L, 0);
        when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(1)).thenReturn(List.of(c1));
        when(chunkEmbeddingService.decode(c1)).thenReturn(null); // no stored vector
        List<DocumentChunkDto> keywordResult = List.of(dto(10L, 0.7));
        when(keywordService.retrieveByKeyword(1, "q", 3)).thenReturn(keywordResult);

        List<DocumentChunkDto> result = hybrid.retrieveByKeyword(1, "q", 3);

        assertSame(keywordResult, result);
    }

    @Test
    void hybridSurfacesSemanticMatchKeywordMissed() {
        aiProperties.getRetrieval().setStrategy("hybrid");
        aiProperties.getRetrieval().setKeywordWeight(0.4);
        aiProperties.getRetrieval().setEmbeddingWeight(0.6);

        float[] query = {1f, 0f};
        when(chunkEmbeddingService.embedQuery("q")).thenReturn(query);

        // chunk 10: no keyword match, but embedding aligned with the query (cosine = 1).
        // chunk 20: strong keyword match, but embedding orthogonal (cosine = 0).
        DocumentChunk c10 = chunk(10L, 0);
        DocumentChunk c20 = chunk(20L, 1);
        when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(1))
                .thenReturn(List.of(c10, c20));
        when(chunkEmbeddingService.decode(c10)).thenReturn(new float[]{1f, 0f});
        when(chunkEmbeddingService.decode(c20)).thenReturn(new float[]{0f, 1f});

        // Keyword pool: only chunk 20 scored.
        when(keywordService.retrieveByKeyword(eq(1), eq("q"), intThat(k -> k >= 50)))
                .thenReturn(List.of(dto(20L, 5.0)));

        List<DocumentChunkDto> result = hybrid.retrieveByKeyword(1, "q", 2);

        // chunk 10 (semantic 0.6) must outrank chunk 20 (keyword 0.4).
        assertEquals(2, result.size());
        assertEquals(10L, result.get(0).getChunkId());
        assertEquals(20L, result.get(1).getChunkId());
    }

    // --- helpers ---

    private DocumentChunkDto dto(Long id, double score) {
        return DocumentChunkDto.builder().chunkId(id).score(score).build();
    }

    private DocumentChunk chunk(Long id, int index) {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc");
        DocumentChunk c = new DocumentChunk();
        c.setChunkId(id);
        c.setChunkIndex(index);
        c.setChunkText("text " + id);
        c.setDocument(doc);
        return c;
    }
}
