package com.demo.ai_study_hub.service;

import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@Component
public class PptxTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(PptxTextExtractor.class);

    public static class PptxExtractionResult {
        public final String rawText;
        public final boolean success;
        public final String errorMessage;

        private PptxExtractionResult(String rawText) {
            this.rawText = rawText;
            this.success = true;
            this.errorMessage = null;
        }

        private PptxExtractionResult(String errorMessage, boolean ignored) {
            this.rawText = null;
            this.success = false;
            this.errorMessage = errorMessage;
        }

        public static PptxExtractionResult ok(String text) {
            return new PptxExtractionResult(text);
        }

        public static PptxExtractionResult failed(String msg) {
            return new PptxExtractionResult(msg, false);
        }
    }

    public PptxExtractionResult extract(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return PptxExtractionResult.failed("Empty file");
        }
        try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
            StringBuilder sb = new StringBuilder();
            int slideNumber = 1;

            for (XSLFSlide slide : ppt.getSlides()) {
                sb.append("Slide ").append(slideNumber++).append(":\n");
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        String text = textShape.getText();
                        if (text != null && !text.isBlank()) {
                            sb.append(text).append("\n");
                        }
                    }
                }
                sb.append("\n");
            }

            return PptxExtractionResult.ok(sb.toString());

        } catch (IOException e) {
            log.warn("PPTX parsing failed: {}", e.getMessage());
            return PptxExtractionResult.failed("PPTX parsing failed: " + e.getMessage());
        } catch (Exception e) {
            log.warn("Unexpected error during PPTX extraction: {}", e.getMessage());
            return PptxExtractionResult.failed("Unexpected PPTX extraction error");
        }
    }
}
