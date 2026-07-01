package com.demo.ai_study_hub.service;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@Component
public class DocxTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(DocxTextExtractor.class);

    public static class DocxExtractionResult {
        public final String rawText;
        public final boolean success;
        public final String errorMessage;

        private DocxExtractionResult(String rawText) {
            this.rawText = rawText;
            this.success = true;
            this.errorMessage = null;
        }

        private DocxExtractionResult(String errorMessage, boolean ignored) {
            this.rawText = null;
            this.success = false;
            this.errorMessage = errorMessage;
        }

        public static DocxExtractionResult ok(String text) {
            return new DocxExtractionResult(text);
        }

        public static DocxExtractionResult failed(String msg) {
            return new DocxExtractionResult(msg, false);
        }
    }

    public DocxExtractionResult extract(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return DocxExtractionResult.failed("Empty file");
        }
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();

            // Extract paragraphs
            for (XWPFParagraph para : doc.getParagraphs()) {
                String text = para.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            }

            // Extract tables
            for (XWPFTable table : doc.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        String cellText = cell.getText();
                        if (cellText != null && !cellText.isBlank()) {
                            sb.append(cellText).append("\t");
                        }
                    }
                    sb.append("\n");
                }
            }

            return DocxExtractionResult.ok(sb.toString());

        } catch (IOException e) {
            log.warn("DOCX parsing failed: {}", e.getMessage());
            return DocxExtractionResult.failed("DOCX parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error during DOCX extraction: {}", e.getMessage());
            return DocxExtractionResult.failed("Unexpected DOCX extraction error");
        }
    }
}
