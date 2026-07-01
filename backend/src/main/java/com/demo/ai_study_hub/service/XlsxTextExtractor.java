package com.demo.ai_study_hub.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@Component
public class XlsxTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(XlsxTextExtractor.class);

    public static class XlsxExtractionResult {
        public final String rawText;
        public final boolean success;
        public final String errorMessage;

        private XlsxExtractionResult(String rawText) {
            this.rawText = rawText;
            this.success = true;
            this.errorMessage = null;
        }

        private XlsxExtractionResult(String errorMessage, boolean ignored) {
            this.rawText = null;
            this.success = false;
            this.errorMessage = errorMessage;
        }

        public static XlsxExtractionResult ok(String text) {
            return new XlsxExtractionResult(text);
        }

        public static XlsxExtractionResult failed(String msg) {
            return new XlsxExtractionResult(msg, false);
        }
    }

    public XlsxExtractionResult extract(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return XlsxExtractionResult.failed("Empty file");
        }
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                sb.append("Sheet: ").append(sheet.getSheetName()).append("\n");

                for (Row row : sheet) {
                    StringBuilder rowSb = new StringBuilder();
                    for (Cell cell : row) {
                        String cellValue = getCellValueAsString(cell);
                        if (cellValue != null && !cellValue.isBlank()) {
                            rowSb.append(cellValue).append("\t");
                        }
                    }
                    String rowText = rowSb.toString().strip();
                    if (!rowText.isBlank()) {
                        sb.append(rowText).append("\n");
                    }
                }
                sb.append("\n");
            }

            return XlsxExtractionResult.ok(sb.toString());

        } catch (IOException e) {
            log.warn("XLSX parsing failed: {}", e.getMessage());
            return XlsxExtractionResult.failed("XLSX parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error during XLSX extraction: {}", e.getMessage());
            return XlsxExtractionResult.failed("Unexpected XLSX extraction error");
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val) && !Double.isInfinite(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }
}
