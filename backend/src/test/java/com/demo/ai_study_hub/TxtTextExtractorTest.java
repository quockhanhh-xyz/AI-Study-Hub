package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.TxtTextExtractor;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class TxtTextExtractorTest {

    private final TxtTextExtractor extractor = new TxtTextExtractor();

    @Test
    void extract_WhenNullBytes_ShouldReturnEmpty() {
        assertEquals("", extractor.extract(null));
    }

    @Test
    void extract_WhenEmptyBytes_ShouldReturnEmpty() {
        assertEquals("", extractor.extract(new byte[0]));
    }

    @Test
    void extract_WhenUtf8Text_ShouldDecodeCorrectly() {
        byte[] bytes = "Hello World".getBytes(StandardCharsets.UTF_8);
        assertEquals("Hello World", extractor.extract(bytes));
    }

    @Test
    void extract_WhenUtf8WithBom_ShouldStripBom() {
        byte[] bom = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] content = "Hello".getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[bom.length + content.length];
        System.arraycopy(bom, 0, withBom, 0, bom.length);
        System.arraycopy(content, 0, withBom, bom.length, content.length);
        assertEquals("Hello", extractor.extract(withBom));
    }

    @Test
    void extract_WhenVietnameseUtf8_ShouldDecodeCorrectly() {
        String vietnamese = "Xin chào thế giới";
        byte[] bytes = vietnamese.getBytes(StandardCharsets.UTF_8);
        assertEquals(vietnamese, extractor.extract(bytes));
    }
}
