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

    public static class PdfExtractionResult {
        public final String rawText;
        public final List<Integer> pageStartOffsets; // char offset in rawText where each page starts
        public final boolean success;
        public final String errorMessage;

        private PdfExtractionResult(String rawText, List<Integer> pageStartOffsets) {
            this.rawText = rawText;
            this.pageStartOffsets = pageStartOffsets;
            this.success = true;
            this.errorMessage = null;
        }

        private PdfExtractionResult(String errorMessage) {
            this.rawText = null;
            this.pageStartOffsets = null;
            this.success = false;
            this.errorMessage = errorMessage;
        }

        public static PdfExtractionResult ok(String text, List<Integer> offsets) {
            return new PdfExtractionResult(text, offsets);
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

            PDFTextStripper stripper = new PDFTextStripper();
            List<Integer> pageStartOffsets = new ArrayList<>();
            StringBuilder fullText = new StringBuilder();

            for (int i = 1; i <= pageCount; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(document);
                pageStartOffsets.add(fullText.length());
                fullText.append(pageText);
            }

            return PdfExtractionResult.ok(fullText.toString(), pageStartOffsets);

        } catch (IOException e) {
            log.warn("PDF parsing failed: {}", e.getMessage());
            return PdfExtractionResult.failed("PDF parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error during PDF extraction: {}", e.getMessage());
            return PdfExtractionResult.failed("Unexpected PDF extraction error");
        }
    }
}
