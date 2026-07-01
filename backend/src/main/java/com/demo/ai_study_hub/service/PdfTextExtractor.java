package com.demo.ai_study_hub.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class PdfTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(PdfTextExtractor.class);
    private static final int MAX_PAGES = 2000;

    public static class PdfExtractionResult {
        public final List<String> pageTexts;
        public final boolean success;
        public final String errorMessage;

        private PdfExtractionResult(List<String> pageTexts) {
            this.pageTexts = pageTexts;
            this.success = true;
            this.errorMessage = null;
        }

        private PdfExtractionResult(String errorMessage) {
            this.pageTexts = null;
            this.success = false;
            this.errorMessage = errorMessage;
        }

        public static PdfExtractionResult ok(List<String> pageTexts) {
            return new PdfExtractionResult(pageTexts);
        }

        public static PdfExtractionResult failed(String msg) {
            return new PdfExtractionResult(msg);
        }
    }

    public PdfExtractionResult extract(byte[] pdfBytes) {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            int pageCount = document.getNumberOfPages();
            if (pageCount == 0) {
                return PdfExtractionResult.failed("PDF has no pages");
            }
            if (pageCount > MAX_PAGES) {
                return PdfExtractionResult.failed("PDF exceeds maximum allowed page count (" + MAX_PAGES + ")");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            List<String> pageTexts = new ArrayList<>();

            for (int i = 1; i <= pageCount; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(document);
                pageTexts.add(pageText);
            }

            return PdfExtractionResult.ok(pageTexts);

        } catch (IOException e) {
            log.warn("PDF parsing failed: {}", e.getMessage());
            return PdfExtractionResult.failed("PDF parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error during PDF extraction: {}", e.getMessage());
            return PdfExtractionResult.failed("Unexpected PDF extraction error");
        }
    }
}
