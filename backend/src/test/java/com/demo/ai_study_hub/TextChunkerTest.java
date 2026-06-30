package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.service.TextChunker;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TextChunkerTest {

    private final TextChunker chunker = new TextChunker();

    @Test
    void chunk_WhenNullInput_ShouldReturnEmpty() {
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(null);
        assertTrue(chunks.isEmpty());
    }

    @Test
    void chunk_WhenBlankInput_ShouldReturnEmpty() {
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk("   ");
        assertTrue(chunks.isEmpty());
    }

    @Test
    void chunk_WhenShortText_ShouldReturnSingleChunk() {
        String text = "Hello world. This is a short document.";
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(text);
        assertEquals(1, chunks.size());
        assertEquals(0, chunks.get(0).getChunkIndex());
        assertEquals(text.strip(), chunks.get(0).getChunkText());
    }

    @Test
    void chunk_ShouldHaveSequentialChunkIndexes() {
        String text = "word ".repeat(1000);
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(text);
        for (int i = 0; i < chunks.size(); i++) {
            assertEquals(i, chunks.get(i).getChunkIndex());
        }
    }

    @Test
    void chunk_ShouldNotProduceEmptyChunks() {
        String text = "paragraph one.\n\nparagraph two.\n\nparagraph three.";
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(text);
        for (ExtractionResult.ExtractedChunk chunk : chunks) {
            assertFalse(chunk.getChunkText().isBlank());
        }
    }

    @Test
    void chunk_ShouldHaveCorrectCharacterCount() {
        String text = "word ".repeat(500);
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(text);
        for (ExtractionResult.ExtractedChunk chunk : chunks) {
            assertEquals(chunk.getChunkText().length(), chunk.getCharacterCount());
        }
    }

    @Test
    void chunk_WhenLongText_ShouldRespectMaxChunkSize() {
        String text = "a".repeat(50_000);
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunk(text);
        for (ExtractionResult.ExtractedChunk chunk : chunks) {
            assertTrue(chunk.getCharacterCount() <= 1200,
                    "Chunk size exceeded max: " + chunk.getCharacterCount());
        }
    }

    @Test
    void chunkWithPages_ShouldEnrichPageMetadata() {
        String text = "Page one content. " + "word ".repeat(100) + "\nPage two content.";
        List<Integer> pageOffsets = List.of(0, 100);
        List<ExtractionResult.ExtractedChunk> chunks = chunker.chunkWithPages(text, pageOffsets);
        assertFalse(chunks.isEmpty());
        assertNotNull(chunks.get(0).getPageNumber());
        assertNotNull(chunks.get(0).getSourceLabel());
        assertTrue(chunks.get(0).getSourceLabel().startsWith("Page "));
    }
}
