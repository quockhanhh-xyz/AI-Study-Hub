package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.PptxTextExtractor;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.junit.jupiter.api.Test;

import java.awt.geom.Rectangle2D;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class PptxTextExtractorTest {

    private final PptxTextExtractor extractor = new PptxTextExtractor();

    @Test
    void extract_WhenPptxHasSlideText_ShouldReturnText() throws IOException {
        byte[] bytes = buildPptx("Introduction slide", "Key points here");

        PptxTextExtractor.PptxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Introduction slide"));
        assertTrue(result.rawText.contains("Key points here"));
    }

    @Test
    void extract_WhenPptxHasMultipleSlides_ShouldIncludeAllSlides() throws IOException {
        byte[] bytes = buildPptx("Slide one content", "Slide two content", "Slide three content");

        PptxTextExtractor.PptxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Slide one content"));
        assertTrue(result.rawText.contains("Slide two content"));
        assertTrue(result.rawText.contains("Slide three content"));
    }

    @Test
    void extract_WhenEmptyBytes_ShouldReturnFailed() {
        PptxTextExtractor.PptxExtractionResult result = extractor.extract(new byte[0]);

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    @Test
    void extract_WhenNullBytes_ShouldReturnFailed() {
        PptxTextExtractor.PptxExtractionResult result = extractor.extract(null);

        assertFalse(result.success);
    }

    @Test
    void extract_WhenCorruptBytes_ShouldReturnFailed() {
        PptxTextExtractor.PptxExtractionResult result = extractor.extract("not a pptx".getBytes());

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    private byte[] buildPptx(String... slideTexts) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow()) {
            for (String text : slideTexts) {
                XSLFSlide slide = ppt.createSlide();
                XSLFTextBox box = slide.createTextBox();
                box.setAnchor(new Rectangle2D.Double(50, 50, 400, 100));
                box.setText(text);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ppt.write(out);
            return out.toByteArray();
        }
    }
}
