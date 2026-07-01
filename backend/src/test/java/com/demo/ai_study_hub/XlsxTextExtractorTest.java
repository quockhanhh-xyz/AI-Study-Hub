package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.XlsxTextExtractor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class XlsxTextExtractorTest {

    private final XlsxTextExtractor extractor = new XlsxTextExtractor();

    @Test
    void extract_WhenXlsxHasCellData_ShouldReturnText() throws IOException {
        byte[] bytes = buildXlsx("Sheet1", new String[][]{
                {"Name", "Score"},
                {"Alice", "95"},
                {"Bob", "88"}
        });

        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Name"));
        assertTrue(result.rawText.contains("Alice"));
        assertTrue(result.rawText.contains("95"));
    }

    @Test
    void extract_WhenXlsxHasMultipleSheets_ShouldIncludeAllSheets() throws IOException {
        byte[] bytes = buildXlsxMultiSheet(
                new String[]{"Sheet1", "Sheet2"},
                new String[][][] {
                        {{"Revenue", "1000"}},
                        {{"Expenses", "500"}}
                }
        );

        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
        assertTrue(result.rawText.contains("Revenue"));
        assertTrue(result.rawText.contains("Expenses"));
    }

    @Test
    void extract_WhenXlsxIsEmpty_ShouldReturnSuccessWithBlankText() throws IOException {
        byte[] bytes = buildXlsx("EmptySheet", new String[][]{});

        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract(bytes);

        assertTrue(result.success);
    }

    @Test
    void extract_WhenEmptyBytes_ShouldReturnFailed() {
        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract(new byte[0]);

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    @Test
    void extract_WhenNullBytes_ShouldReturnFailed() {
        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract(null);

        assertFalse(result.success);
    }

    @Test
    void extract_WhenCorruptBytes_ShouldReturnFailed() {
        XlsxTextExtractor.XlsxExtractionResult result = extractor.extract("not an xlsx".getBytes());

        assertFalse(result.success);
        assertNotNull(result.errorMessage);
    }

    private byte[] buildXlsx(String sheetName, String[][] rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet(sheetName);
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private byte[] buildXlsxMultiSheet(String[] sheetNames, String[][][] sheetsData) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            for (int s = 0; s < sheetNames.length; s++) {
                Sheet sheet = wb.createSheet(sheetNames[s]);
                for (int r = 0; r < sheetsData[s].length; r++) {
                    Row row = sheet.createRow(r);
                    for (int c = 0; c < sheetsData[s][r].length; c++) {
                        row.createCell(c).setCellValue(sheetsData[s][r][c]);
                    }
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }
}
