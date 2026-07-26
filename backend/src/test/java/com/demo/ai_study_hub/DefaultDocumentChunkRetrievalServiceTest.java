package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.DocumentChunkDto;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.DocumentChunk;
import com.demo.ai_study_hub.repository.DocumentChunkRepository;
import com.demo.ai_study_hub.service.DefaultDocumentChunkRetrievalService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Focused tests for the keyword tokenizer's Vietnamese support (Change 1).
 * Before the fix, Vietnamese diacritics were stripped and words shattered into
 * sub-3-char fragments that got filtered out, so Vietnamese questions matched nothing.
 */
@ExtendWith(MockitoExtension.class)
class DefaultDocumentChunkRetrievalServiceTest {

    @Mock
    private DocumentChunkRepository documentChunkRepository;
    @Mock
    private EntityManager entityManager;

    private DefaultDocumentChunkRetrievalService service() {
        return new DefaultDocumentChunkRetrievalService(documentChunkRepository, entityManager);
    }

    @Test
    void vietnameseQuestionMatchesAccentedChunk() {
        DocumentChunk c1 = chunk(1L, 0, "Lập trình hướng đối tượng là một phương pháp lập trình phổ biến.");
        DocumentChunk c2 = chunk(2L, 1, "Cơ sở dữ liệu quan hệ lưu trữ thông tin theo bảng.");
        when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(1))
                .thenReturn(List.of(c1, c2));

        List<DocumentChunkDto> result =
                service().retrieveByKeyword(1, "Giải thích khái niệm lập trình hướng đối tượng", 5);

        assertFalse(result.isEmpty(), "Vietnamese question must now match content");
        assertEquals(1L, result.get(0).getChunkId(), "The chunk about lập trình must rank first");
    }

    @Test
    void englishTokenizationStillWorks() {
        DocumentChunk c1 = chunk(1L, 0, "Object oriented programming is a popular programming paradigm.");
        DocumentChunk c2 = chunk(2L, 1, "Relational databases store information in tables.");
        when(documentChunkRepository.findByDocument_DocumentIdOrderByChunkIndexAsc(1))
                .thenReturn(List.of(c1, c2));

        List<DocumentChunkDto> result =
                service().retrieveByKeyword(1, "explain object oriented programming", 5);

        assertFalse(result.isEmpty());
        assertEquals(1L, result.get(0).getChunkId());
    }

    private DocumentChunk chunk(Long id, int index, String text) {
        Document doc = new Document();
        doc.setDocumentId(1);
        doc.setTitle("Doc");
        DocumentChunk c = new DocumentChunk();
        c.setChunkId(id);
        c.setChunkIndex(index);
        c.setChunkText(text);
        c.setDocument(doc);
        return c;
    }
}
