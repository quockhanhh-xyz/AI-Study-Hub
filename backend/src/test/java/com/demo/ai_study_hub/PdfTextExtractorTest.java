package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.PdfTextExtractor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfTextExtractorTest {

    private final PdfTextExtractor extractor = new PdfTextExtractor();

    @Test
    void extract_WhenPdfHasRealText_ShouldReturnSuccessWithCorrectPageCount() throws IOException {
        byte[] pdfBytes = buildTextPdf(List.of(
                "This is page one content.",
                "This is page two content."
        ));

        PdfTextExtractor.PdfExtractionResult result = extractor.extract(pdfBytes);

        assertTrue(result.success);
        assertEquals(2, result.pageTexts.size());
        assertTrue(result.pageTexts.get(0).contains("page one"));
        assertTrue(result.pageTexts.get(1).contains("page two"));
    }

    @Test
    void extract_WhenScannedPdfWithNoText_ShouldReturnEmptyPageTexts() throws IOException {
        // Simulates a scanned PDF: valid PDF structure but no text layer
        byte[] pdfBytes = buildBlankPdf(1);

        PdfTextExtractor.PdfExtractionResult result = extractor.extract(pdfBytes);

        assertTrue(result.success);
        assertEquals(1, result.pageTexts.size());
        assertTrue(result.pageTexts.get(0).isBlank());
    }

    @Test
    void extract_WhenCorruptPdfBytes_ShouldReturnFailure() {
        byte[] corruptBytes = "this is not a real pdf file".getBytes();

        PdfTextExtractor.PdfExtractionResult result = extractor.extract(corruptBytes);

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    @Test
    void extract_WhenEmptyByteArray_ShouldReturnFailure() {
        PdfTextExtractor.PdfExtractionResult result = extractor.extract(new byte[0]);

        assertFalse(result.success);
    }

    @Test
    void extract_WhenSinglePagePdf_ShouldReturnOnePageText() throws IOException {
        byte[] pdfBytes = buildTextPdf(List.of("Only one page here."));

        PdfTextExtractor.PdfExtractionResult result = extractor.extract(pdfBytes);

        assertTrue(result.success);
        assertEquals(1, result.pageTexts.size());
    }

    /**
     * Builds a real PDF in memory with one page per string, each containing
     * actual extractable text (not an image). Acts as a dynamic fixture.
     */
    private byte[] buildTextPdf(List<String> pageContents) throws IOException {
        try (PDDocument document = new PDDocument()) {
            for (String content : pageContents) {
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                    stream.beginText();
                    stream.setFont(PDType1Font.HELVETICA, 12);
                    stream.newLineAtOffset(50, 700);
                    stream.showText(content);
                    stream.endText();
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    /**
     * Builds a valid PDF with blank pages (no text content) — simulates
     * a scanned PDF that has no extractable text layer.
     */
    private byte[] buildBlankPdf(int pageCount) throws IOException {
        try (PDDocument document = new PDDocument()) {
            for (int i = 0; i < pageCount; i++) {
                document.addPage(new PDPage(PDRectangle.A4));
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }
}
