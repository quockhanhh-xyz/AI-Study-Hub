package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.DocxTextExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class DocxTextExtractorTest {

    private final DocxTextExtractor extractor = new DocxTextExtractor();

    @Test
    void extract_WhenDocxHasParagraphs_ShouldReturnText() throws IOException {
        byte[] bytes = buildDocx("Hello world.", "Second paragraph here.");

        DocxTextExtractor.DocxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Hello world."));
        assertTrue(result.rawText.contains("Second paragraph here."));
    }

    @Test
    void extract_WhenDocxHasTable_ShouldIncludeTableText() throws IOException {
        byte[] bytes = buildDocxWithTable(new String[][]{
                {"Name", "Score"},
                {"Alice", "95"}
        });

        DocxTextExtractor.DocxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Name") || result.rawText.contains("Alice"));
    }

    @Test
    void extract_WhenEmptyBytes_ShouldReturnFailed() {
        DocxTextExtractor.DocxExtractionResult result = extractor.extract(new byte[0]);

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    @Test
    void extract_WhenNullBytes_ShouldReturnFailed() {
        DocxTextExtractor.DocxExtractionResult result = extractor.extract(null);

        assertFalse(result.success);
    }

    @Test
    void extract_WhenCorruptBytes_ShouldReturnFailed() {
        DocxTextExtractor.DocxExtractionResult result = extractor.extract("not a docx".getBytes());

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    private byte[] buildDocx(String... paragraphs) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            for (String text : paragraphs) {
                XWPFParagraph para = doc.createParagraph();
                XWPFRun run = para.createRun();
                run.setText(text);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    private byte[] buildDocxWithTable(String[][] rows) throws IOException {
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFTable table = doc.createTable(rows.length, rows[0].length);
            for (int r = 0; r < rows.length; r++) {
                XWPFTableRow row = table.getRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.getCell(c).setText(rows[r][c]);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }
}
