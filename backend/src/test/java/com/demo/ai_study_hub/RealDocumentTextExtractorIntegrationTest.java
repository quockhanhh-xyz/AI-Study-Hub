package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;
import com.demo.ai_study_hub.service.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Integration test that exercises the real PdfTextExtractor, TextCleaner,
 * and TextChunker together — only the network download step is mocked,
 * since Cloudinary access must never be hit in automated tests.
 */
@ExtendWith(MockitoExtension.class)
class RealDocumentTextExtractorIntegrationTest {

    @Mock
    private SecureFileDownloader secureFileDownloader;

    private RealDocumentTextExtractor extractor;
    private Document mockDoc;

    @BeforeEach
    void setUp() {
        extractor = new RealDocumentTextExtractor(
                secureFileDownloader,
                new PdfTextExtractor(),
                new TxtTextExtractor(),
                new TextCleaner(),
                new TextChunker()
        );

        mockDoc = new Document();
        mockDoc.setDocumentId(1);
        mockDoc.setFileUrl("https://res.cloudinary.com/demo/file.pdf");
        mockDoc.setFileType("PDF");
    }

    @Test
void extract_WhenRealMultiPagePdf_ShouldProduceCompletedResultWithAccuratePageChunks() throws IOException {
    // Make each page long enough (>1000 chars) to force the chunker to split
    // pages into separate chunks, so page metadata can be verified per chunk.
    String page1Content = "Introduction paragraph about the course syllabus and objectives for this semester. "
            .repeat(15);
    String page2Content = "Chapter two covers advanced topics including data structures and algorithms in depth. "
            .repeat(15);

    byte[] pdfBytes = buildTextPdf(page1Content, page2Content);
    when(secureFileDownloader.download(anyStringMatcher())).thenReturn(pdfBytes);

    ExtractionResult result = extractor.extract(mockDoc);

    assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
    assertNotNull(result.getExtractedText());
    assertTrue(result.getExtractedText().contains("Introduction"));
    assertTrue(result.getExtractedText().contains("Chapter two"));
    assertTrue(result.getChunks().size() >= 2, "Expected multiple chunks given the longer page content");


    boolean foundPage2Chunk = result.getChunks().stream()
            .anyMatch(c -> c.getChunkText().contains("Chapter two covers advanced")
                    && c.getPageNumber() == 2);
    assertTrue(foundPage2Chunk, "Expected the chunk starting at page 2's content to report pageNumber=2");


    assertEquals(1, result.getChunks().get(0).getPageNumber());
}

    @Test
    void extract_WhenRealScannedPdf_ShouldReturnEmptyContent() throws IOException {
        byte[] blankPdfBytes = buildBlankPdf(2);
        when(secureFileDownloader.download(anyStringMatcher())).thenReturn(blankPdfBytes);

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.EMPTY_CONTENT, result.getStatus());
    }

    @Test
    void extract_WhenRealCorruptPdf_ShouldReturnFailedWithoutCrashing() {
        byte[] corruptBytes = "not a valid pdf".getBytes();
        when(secureFileDownloader.download(anyStringMatcher())).thenReturn(corruptBytes);

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.FAILED, result.getStatus());
    }

    @Test
    void extract_WhenRealTxtFile_ShouldChunkCorrectly() {
        mockDoc.setFileType("TXT");
        mockDoc.setFileUrl("https://res.cloudinary.com/demo/file.txt");
        String content = "First paragraph with some content here.\n\nSecond paragraph with more content.";
        when(secureFileDownloader.download(anyStringMatcher())).thenReturn(content.getBytes());

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        assertFalse(result.getChunks().isEmpty());
    }

    private String anyStringMatcher() {
        return org.mockito.ArgumentMatchers.anyString();
    }

    private byte[] buildTextPdf(String... pageContents) throws IOException {
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
